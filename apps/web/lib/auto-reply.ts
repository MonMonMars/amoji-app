/**
 * Ops / support auto-reply templates (distinct from the on-device crisis guard).
 * Crisis replies stay in lib/crisis.ts and never go through email.
 */

import type { Lang } from './prefs';

export type AutoReplyKind = 'reportAck' | 'supportAck' | 'paymentReceipt';

const EN: Record<AutoReplyKind, { subject: string; body: string }> = {
  reportAck: {
    subject: 'We received your Amoji report',
    body: 'Thanks for reporting. Your note is saved for review. This is an automatic acknowledgment — a person may follow up if more detail is needed. If you are in crisis, use the helplines on the safety page instead of waiting for email.',
  },
  supportAck: {
    subject: 'Amoji support — we got your message',
    body: 'This is an automatic reply confirming we received your message. For safety emergencies, contact local emergency services or the helplines listed in the app.',
  },
  paymentReceipt: {
    subject: 'Amoji Plus — payment recorded',
    body: 'Thanks. Your Plus entitlement is active for this account/session when the payment webhook confirms. Keep your receipt from the payment provider for your records.',
  },
};

const YUE: Record<AutoReplyKind, { subject: string; body: string }> = {
  reportAck: {
    subject: '我哋收到你嘅 Amoji 舉報',
    body: '多謝你舉報。你嘅紀錄已經收妥等審核。呢封係自動確認信——如有需要，人或會再聯絡你。如果你正喺危機入面，請用安全資訊頁嘅求助電話，唔好等電郵。',
  },
  supportAck: {
    subject: 'Amoji 支援——我哋收到你嘅訊息',
    body: '呢封係自動回覆，確認收到你嘅訊息。緊急情況請打當地緊急電話，或者用 App 入面嘅求助熱線。',
  },
  paymentReceipt: {
    subject: 'Amoji Plus——已記錄付款',
    body: '多謝。付款 webhook 確認之後，你嘅 Plus 權益會生效。請保留付款服務商嘅收據。',
  },
};

const ZH: Record<AutoReplyKind, { subject: string; body: string }> = {
  reportAck: {
    subject: '我们已收到你的 Amoji 举报',
    body: '感谢举报。你的记录已保存待审。这是自动确认信——如有需要，人工可能会再联系你。若你正处于危机，请使用安全信息页上的求助电话，不要等待邮件。',
  },
  supportAck: {
    subject: 'Amoji 支持——我们已收到你的消息',
    body: '这是自动回复，确认我们收到了你的消息。紧急情况请拨打当地紧急电话，或使用应用内的求助热线。',
  },
  paymentReceipt: {
    subject: 'Amoji Plus——已记录付款',
    body: '谢谢。付款 webhook 确认后，你的 Plus 权益会生效。请保留支付服务商的收据。',
  },
};

const JA: Record<AutoReplyKind, { subject: string; body: string }> = {
  reportAck: {
    subject: 'Amoji の報告を受け取りました',
    body: 'ご報告ありがとうございます。内容は確認待ちとして保存されています。これは自動の受付メールです。追加の連絡が必要な場合のみ人が返信します。つらい状態のときは、メールを待たず安全ページの相談窓口を使ってください。',
  },
  supportAck: {
    subject: 'Amoji サポート——メッセージを受け取りました',
    body: 'これは自動返信です。緊急時は地域の救急番号か、アプリ内の相談窓口を使ってください。',
  },
  paymentReceipt: {
    subject: 'Amoji Plus——お支払いを記録しました',
    body: 'ありがとうございます。支払い webhook の確認後に Plus が有効になります。決済事業者の領収書は保管してください。',
  },
};

const BY_LANG: Record<Lang, Record<AutoReplyKind, { subject: string; body: string }>> = {
  en: EN,
  yue: YUE,
  zh: ZH,
  ja: JA,
};

export function autoReply(kind: AutoReplyKind, lang: Lang = 'en'): { subject: string; body: string } {
  return BY_LANG[lang]?.[kind] ?? EN[kind];
}
