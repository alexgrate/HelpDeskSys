import {
  Monitor, Banknote, CreditCard, Wrench, Users, ShieldAlert, ShoppingBag,
  Scale, Key, Database, HelpCircle, Activity, UserCog, Laptop, BookOpen,
} from "lucide-react";

// Maps TicketCategory.icon_name (ICON_CHOICES on the backend) to a lucide icon.
const ICONS = {
  Monitor, Banknote, CreditCard, Wrench, Users, ShieldAlert, ShoppingBag,
  Scale, Key, Database, HelpCircle, Activity, UserCog, Laptop,
};

export function categoryIcon(name) {
  return ICONS[name] || BookOpen;
}
