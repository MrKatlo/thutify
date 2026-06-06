-- Institution notification and email settings (Phase E)
ALTER TABLE institutions ADD COLUMN email_notifications INTEGER DEFAULT 1;
ALTER TABLE institutions ADD COLUMN sms_notifications INTEGER DEFAULT 0;
ALTER TABLE institutions ADD COLUMN payment_gateway TEXT DEFAULT 'Stripe';
ALTER TABLE institutions ADD COLUMN announcement_email_enabled INTEGER DEFAULT 0;
