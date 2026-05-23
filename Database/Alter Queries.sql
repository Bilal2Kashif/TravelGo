ALTER TABLE [USER]
ADD CONSTRAINT chk_FirstName
CHECK (FirstName NOT LIKE '%[^A-Za-z]%');

ALTER TABLE [USER]
ADD CONSTRAINT chk_LastName
CHECK (LastName NOT LIKE '%[^A-Za-z]%');

ALTER TABLE [USER]
ADD CONSTRAINT chk_Phone_11Digits
CHECK (
    Phone NOT LIKE '%[^0-9]%'  -- only digits
    AND LEN(Phone) = 11        -- exactly 11 characters
);