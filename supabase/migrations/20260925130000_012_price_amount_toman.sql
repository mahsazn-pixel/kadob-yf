/*
  Store and display all product prices in toman.
  price_amount values were already toman; currency code is now IRT.
*/

ALTER TABLE products
  ALTER COLUMN currency SET DEFAULT 'IRT';

UPDATE products
SET currency = 'IRT'
WHERE currency IS NULL OR currency = 'IRR';
