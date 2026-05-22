-- Add verification_status to transactions for role-based approval workflow
ALTER TABLE transactions 
ADD COLUMN verification_status TEXT DEFAULT 'pending' 
CHECK (verification_status IN ('pending', 'verified', 'rejected'));

COMMENT ON COLUMN transactions.verification_status IS 'Status of the document verification process by manager/accountant';
