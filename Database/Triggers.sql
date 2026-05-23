-- ------------------------------------------------------------
-- TRIGGER: trg_PreventPastTripBooking

create or alter trigger trg_PreventPastTripBooking
on BOOKING
after insert
as
begin
    set nocount on;

    if exists (
        select 1 from inserted i
        join TRIP t on i.TripID = t.TripID
        where t.TripDate < cast(getdate() as date)
    )
    begin
        raiserror('Cannot book a trip that has already passed.', 16, 1);
        rollback transaction;
    end
end
go


