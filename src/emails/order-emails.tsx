import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { GRIND_LABELS, type Order, type Settings } from "@/domain/types";
import { formatCents } from "@/lib/money";

const c = {
  bg: "#f4efe6",
  card: "#fbf8f2",
  text: "#2b2118",
  muted: "#66594b",
  moss: "#4a5d3a",
  border: "#d9cfbd",
};

function Layout({ preview, title, children }: { preview: string; title: string; children: ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: c.bg, color: c.text, fontFamily: "Georgia, serif", margin: 0, padding: "24px 0" }}>
        <Container style={{ backgroundColor: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 32, maxWidth: 560 }}>
          <Text style={{ color: c.moss, fontSize: 13, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>
            Goblin Coffee
          </Text>
          <Heading as="h1" style={{ fontSize: 26, margin: "8px 0 16px" }}>{title}</Heading>
          {children}
          <Hr style={{ borderColor: c.border, margin: "24px 0" }} />
          <Text style={{ color: c.muted, fontSize: 12, fontFamily: "Arial, sans-serif" }}>
            Small-batch coffee, roasted with nature in mind. Reply to this email if you have any questions.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const p = { fontFamily: "Arial, sans-serif", fontSize: 15, lineHeight: "22px" } as const;

function OrderSummary({ order }: { order: Order }) {
  return (
    <Section style={{ ...p, border: `1px solid ${c.border}`, borderRadius: 8, padding: 16 }}>
      {order.lines.map((l) => (
        <Text key={`${l.variantId}${l.grind}`} style={{ margin: "0 0 6px" }}>
          {l.qty} × {l.productName}, {l.variantLabel} ({GRIND_LABELS[l.grind]}) —{" "}
          {formatCents(l.unitPriceCents * l.qty)}
        </Text>
      ))}
      <Text style={{ margin: "10px 0 0", color: c.muted }}>
        Subtotal {formatCents(order.totals.subtotalCents)} · Delivery {formatCents(order.totals.shippingCents)}
        {order.totals.taxCents > 0 ? ` · ${order.totals.taxLabel} ${formatCents(order.totals.taxCents)}` : ""}
      </Text>
      <Text style={{ margin: "4px 0 0", fontWeight: 700 }}>Total {formatCents(order.totals.totalCents)}</Text>
    </Section>
  );
}

function OrderLink({ order, appUrl }: { order: Order; appUrl: string }) {
  return (
    <Text style={p}>
      <Link href={`${appUrl}/order/${order.number}?t=${order.accessToken}`} style={{ color: c.moss }}>
        View your order {order.number}
      </Link>
    </Text>
  );
}

export interface EmailContext {
  order: Order;
  settings: Settings;
  appUrl: string;
}

function PaymentInstructions({ order, settings }: EmailContext) {
  const due = new Date(order.paymentDueAt).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" });
  return (
    <Section style={{ ...p, backgroundColor: "#dfe5d6", borderRadius: 8, padding: 16, margin: "16px 0" }}>
      <Text style={{ margin: 0, fontWeight: 700 }}>Pay by Interac e-Transfer</Text>
      <Text style={{ margin: "8px 0 0" }}>Send to: <strong>{settings.etransferEmail}</strong></Text>
      <Text style={{ margin: "4px 0 0" }}>Amount: <strong>{formatCents(order.totals.totalCents)}</strong></Text>
      <Text style={{ margin: "4px 0 0" }}>Message: <strong>{order.number}</strong></Text>
      <Text style={{ margin: "8px 0 0", color: c.muted }}>Please send by {due}, or the order will be released.</Text>
    </Section>
  );
}

export const orderEmails = {
  received(ctx: EmailContext) {
    return {
      subject: `Order ${ctx.order.number} received: payment instructions inside`,
      react: (
        <Layout preview={`Send ${formatCents(ctx.order.totals.totalCents)} by e-Transfer to complete your order`} title="Thanks for your order!">
          <Text style={p}>Hi {ctx.order.customer.name.split(" ")[0]}, we&apos;ve got your order. We start roasting as soon as your payment arrives.</Text>
          <PaymentInstructions {...ctx} />
          <OrderSummary order={ctx.order} />
          <OrderLink order={ctx.order} appUrl={ctx.appUrl} />
        </Layout>
      ),
    };
  },
  reminder(ctx: EmailContext) {
    return {
      subject: `Reminder: payment for ${ctx.order.number}`,
      react: (
        <Layout preview="A friendly nudge about your e-Transfer" title="Just a friendly reminder">
          <Text style={p}>We haven&apos;t seen your e-Transfer for order {ctx.order.number} yet. If you&apos;ve already sent it, thank you, and you can ignore this.</Text>
          <PaymentInstructions {...ctx} />
          <OrderLink order={ctx.order} appUrl={ctx.appUrl} />
        </Layout>
      ),
    };
  },
  paid(ctx: EmailContext) {
    return {
      subject: `Payment received for ${ctx.order.number}`,
      react: (
        <Layout preview="Your coffee is heading for the roaster" title="Payment received, thank you!">
          <Text style={p}>Your e-Transfer arrived. Your coffee is now in the roasting queue, and we&apos;ll let you know when it&apos;s on its way.</Text>
          <OrderSummary order={ctx.order} />
          <OrderLink order={ctx.order} appUrl={ctx.appUrl} />
        </Layout>
      ),
    };
  },
  shipped(ctx: EmailContext) {
    const local = ctx.order.fulfillment.method === "local_delivery";
    const t = ctx.order.tracking;
    return {
      subject: local ? `${ctx.order.number} is out for delivery` : `${ctx.order.number} has shipped`,
      react: (
        <Layout preview={local ? "Fresh coffee is on its way" : "Your coffee is on its way"} title={local ? "Out for delivery" : "Your coffee has shipped"}>
          <Text style={p}>Freshly roasted and packed in compostable bags, your coffee is on its way.</Text>
          {t && <Text style={p}>{t.carrier} tracking: <strong>{t.number}</strong></Text>}
          {ctx.order.bagReturn && (
            <Text style={p}>Thanks for joining the bag-return program. Hang on to your empty bag and we&apos;ll collect it next time.</Text>
          )}
          <OrderLink order={ctx.order} appUrl={ctx.appUrl} />
        </Layout>
      ),
    };
  },
  readyForPickup(ctx: EmailContext) {
    return {
      subject: `${ctx.order.number} is ready for pickup`,
      react: (
        <Layout preview="Come grab your coffee" title="Ready for pickup">
          <Text style={p}>Your order is packed and waiting for you.</Text>
          <Text style={p}><strong>{ctx.settings.pickup.location}</strong><br />{ctx.settings.pickup.instructions}</Text>
          {ctx.order.bagReturn && <Text style={p}>Bring your empty bags along. We&apos;ll reuse or compost them.</Text>}
          <OrderLink order={ctx.order} appUrl={ctx.appUrl} />
        </Layout>
      ),
    };
  },
  cancelled(ctx: EmailContext & { reason: string; refundCents: number }) {
    return {
      subject: `${ctx.order.number} has been cancelled`,
      react: (
        <Layout preview="Your order was cancelled" title="Order cancelled">
          <Text style={p}>Your order {ctx.order.number} has been cancelled{ctx.reason ? `: ${ctx.reason}` : "."}</Text>
          {ctx.refundCents > 0 && (
            <Text style={p}>We&apos;ll send a refund of {formatCents(ctx.refundCents)} by e-Transfer to {ctx.order.customer.email}.</Text>
          )}
          <Text style={p}>We hope to roast for you another time.</Text>
        </Layout>
      ),
    };
  },
};
