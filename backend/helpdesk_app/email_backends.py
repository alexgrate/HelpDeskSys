"""
Microsoft Graph e-mail backend.

Sends Django EmailMessage / EmailMultiAlternatives objects through the Microsoft
Graph API (`POST /users/{sender}/sendMail`) using the OAuth2 client-credentials
(app-only) flow. Because it plugs in as a standard Django EMAIL_BACKEND, every
existing caller (send_email_async, model signals, password reset, MFA, …) keeps
working unchanged.

Azure / Entra setup required (one-time):
  1. Register an application in Entra ID (Azure AD).
  2. API permissions → Microsoft Graph → *Application* permission → **Mail.Send**
     → then "Grant admin consent".
  3. Certificates & secrets → new client secret.
  4. (Recommended) Scope the app to a single mailbox with an Exchange
     Application Access Policy so it can only send as MS_GRAPH_SENDER.

Required settings (from environment):
  MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, MS_GRAPH_SENDER
"""

import threading

import msal
import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

GRAPH_SENDMAIL_URL = "https://graph.microsoft.com/v1.0/users/{sender}/sendMail"
GRAPH_SCOPE = ["https://graph.microsoft.com/.default"]

# One ConfidentialClientApplication per (tenant, client) is cached at module level.
# MSAL keeps an in-memory token cache inside it, so access tokens are reused across
# sends/threads until they near expiry — instead of fetching a token per e-mail.
_app_lock = threading.Lock()
_app_cache = {}


def _get_confidential_app(tenant_id, client_id, client_secret):
    key = (tenant_id, client_id)
    with _app_lock:
        app = _app_cache.get(key)
        if app is None:
            app = msal.ConfidentialClientApplication(
                client_id=client_id,
                authority=f"https://login.microsoftonline.com/{tenant_id}",
                client_credential=client_secret,
            )
            _app_cache[key] = app
        return app


class MicrosoftGraphEmailBackend(BaseEmailBackend):
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.tenant_id = getattr(settings, "MS_GRAPH_TENANT_ID", "")
        self.client_id = getattr(settings, "MS_GRAPH_CLIENT_ID", "")
        self.client_secret = getattr(settings, "MS_GRAPH_CLIENT_SECRET", "")
        self.sender = getattr(settings, "MS_GRAPH_SENDER", "") or getattr(
            settings, "DEFAULT_FROM_EMAIL", ""
        )
        self.timeout = getattr(settings, "MS_GRAPH_TIMEOUT", 15)

    def _acquire_token(self):
        app = _get_confidential_app(self.tenant_id, self.client_id, self.client_secret)
        result = app.acquire_token_for_client(scopes=GRAPH_SCOPE)
        if "access_token" not in result:
            raise RuntimeError(
                "Microsoft Graph token request failed: "
                f"{result.get('error')} — {result.get('error_description')}"
            )
        return result["access_token"]

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        missing = [
            name for name, val in (
                ("MS_GRAPH_TENANT_ID", self.tenant_id),
                ("MS_GRAPH_CLIENT_ID", self.client_id),
                ("MS_GRAPH_CLIENT_SECRET", self.client_secret),
                ("MS_GRAPH_SENDER", self.sender),
            ) if not val
        ]
        if missing:
            if self.fail_silently:
                return 0
            raise RuntimeError(
                "Microsoft Graph e-mail is not configured. Missing: " + ", ".join(missing)
            )

        try:
            token = self._acquire_token()
        except Exception:
            if self.fail_silently:
                return 0
            raise

        url = GRAPH_SENDMAIL_URL.format(sender=self.sender)
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        })

        sent = 0
        for message in email_messages:
            try:
                resp = session.post(
                    url, json=self._build_payload(message), timeout=self.timeout
                )
                # Graph returns 202 Accepted on success (empty body).
                if resp.status_code == 202:
                    sent += 1
                elif not self.fail_silently:
                    raise RuntimeError(
                        f"Graph sendMail failed ({resp.status_code}): {resp.text}"
                    )
            except Exception:
                if not self.fail_silently:
                    raise
        return sent

    def _build_payload(self, message):
        # Use the HTML alternative when present (attach_alternative), else plain text.
        content_type, content = "Text", message.body
        for alt_content, alt_mime in (getattr(message, "alternatives", None) or []):
            if alt_mime == "text/html":
                content_type, content = "HTML", alt_content
                break

        def recipients(addresses):
            return [{"emailAddress": {"address": addr}} for addr in addresses if addr]

        graph_message = {
            "subject": message.subject or "",
            "body": {"contentType": content_type, "content": content or ""},
            "toRecipients": recipients(message.to),
        }
        if message.cc:
            graph_message["ccRecipients"] = recipients(message.cc)
        if message.bcc:
            graph_message["bccRecipients"] = recipients(message.bcc)
        if getattr(message, "reply_to", None):
            graph_message["replyTo"] = recipients(message.reply_to)

        return {"message": graph_message, "saveToSentItems": True}
