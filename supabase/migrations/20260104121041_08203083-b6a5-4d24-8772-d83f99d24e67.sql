-- Enable pg_cron and pg_net extensions for scheduled campaign processing
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;