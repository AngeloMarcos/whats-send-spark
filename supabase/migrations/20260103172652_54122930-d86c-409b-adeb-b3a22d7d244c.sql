-- Create trigger to automatically update contact_count on lists table
CREATE TRIGGER contacts_count_trigger
AFTER INSERT OR DELETE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_list_contact_count();