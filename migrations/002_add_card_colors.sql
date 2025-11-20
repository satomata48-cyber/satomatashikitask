-- Add color columns to cards table
ALTER TABLE cards ADD COLUMN title_color TEXT DEFAULT NULL;
ALTER TABLE cards ADD COLUMN description_color TEXT DEFAULT NULL;
ALTER TABLE cards ADD COLUMN due_date_color TEXT DEFAULT NULL;
ALTER TABLE cards ADD COLUMN title_bg_color TEXT DEFAULT NULL;
ALTER TABLE cards ADD COLUMN description_bg_color TEXT DEFAULT NULL;
ALTER TABLE cards ADD COLUMN border_color TEXT DEFAULT NULL;
