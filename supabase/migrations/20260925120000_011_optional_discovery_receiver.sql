/*
  Allow discovery without a preselected receiver.

  Reservation must use the receiver confirmed after "خودشه",
  not the person the session may have started with.
*/

ALTER TABLE discovery_sessions
  ALTER COLUMN receiver_id DROP NOT NULL;

ALTER TABLE user_interactions
  ALTER COLUMN receiver_id DROP NOT NULL;

ALTER TABLE shopping_list_items
  ALTER COLUMN receiver_id DROP NOT NULL;
