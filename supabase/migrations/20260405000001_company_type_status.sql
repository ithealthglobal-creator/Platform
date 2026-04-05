-- Create enums
CREATE TYPE company_type AS ENUM ('admin', 'customer', 'partner');
CREATE TYPE company_status AS ENUM ('prospect', 'active', 'churned', 'pending', 'approved', 'inactive');

-- Add columns with defaults
ALTER TABLE companies ADD COLUMN type company_type NOT NULL DEFAULT 'admin';
ALTER TABLE companies ADD COLUMN status company_status NOT NULL DEFAULT 'active';

-- Migrate existing data: is_active true → active, false → inactive
UPDATE companies SET status = CASE WHEN is_active THEN 'active'::company_status ELSE 'inactive'::company_status END;

-- Drop is_active
ALTER TABLE companies DROP COLUMN is_active;
