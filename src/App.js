-- ================================================================
-- myMayz HR — dopay Sync (FIXED - uses correct column: name)
-- Run in Supabase SQL Editor
-- ================================================================

-- STEP 1: Add new columns
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS dopay_full_name  TEXT,
  ADD COLUMN IF NOT EXISTS national_id      TEXT,
  ADD COLUMN IF NOT EXISTS dopay_mobile     TEXT,
  ADD COLUMN IF NOT EXISTS card_delivered   TEXT,
  ADD COLUMN IF NOT EXISTS payment_method   TEXT DEFAULT 'dopay'
    CHECK (payment_method IN ('dopay','cash')),
  ADD COLUMN IF NOT EXISTS employee_type_v2 TEXT DEFAULT 'staff'
    CHECK (employee_type_v2 IN ('staff','driver','freelance')),
  ADD COLUMN IF NOT EXISTS track_attendance BOOLEAN DEFAULT true;

-- STEP 2: Update 25 matched employees (using correct column: name)

UPDATE employees SET dopay_full_name='Ahmed Khalaf Ahmed Abdel Aziz', national_id='29111262102853', dopay_mobile='+20 10 99689298', card_delivered='16 Feb 2026', payment_method='dopay', track_attendance=true
WHERE (phone='01099689298' OR phone='+20 10 99689298') AND name ILIKE '%Ahmed khalaf%';

UPDATE employees SET dopay_full_name='Mostafa Mohamed Fahmy Khattab', national_id='29602010102218', dopay_mobile='+20 11 22102270', card_delivered='5 Feb 2026', payment_method='dopay', track_attendance=true
WHERE (phone='01122102270' OR phone='+20 11 22102270') AND name ILIKE '%Mostafa%';

UPDATE employees SET dopay_full_name='Heba Samy Mahmoud Mohamed', national_id='30205242200662', dopay_mobile='+20 11 57144003', card_delivered='5 Feb 2026', payment_method='dopay', track_attendance=true
WHERE (phone='01157144003' OR phone='+20 11 57144003') AND name ILIKE '%Heba%';

UPDATE employees SET dopay_full_name='Mohamed Ramadan Sayed Abdel Maguid Saleh', national_id='30508022103278', dopay_mobile='+20 11 49931721', card_delivered='5 Feb 2026', payment_method='dopay', track_attendance=true
WHERE (phone='01149931721' OR phone='+20 11 49931721') AND name ILIKE '%Mohamed%Ramadan%';

UPDATE employees SET dopay_full_name='Ahmed Yasser Ibrahim Abdel Fattah', national_id='30212142103674', dopay_mobile='+20 11 44226384', card_delivered='5 Feb 2026', payment_method='dopay', track_attendance=true
WHERE (phone='01144226384' OR phone='+20 11 44226384') AND name ILIKE '%Ahmed Yasser%';

UPDATE employees SET dopay_full_name='Anas Salah Eldin Abdel Rehim Aly Hussein', national_id='29901182104139', dopay_mobile='+20 11 54832813', card_delivered='11 Dec 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01154832813' OR phone='+20 11 54832813') AND name ILIKE '%Anas%';

UPDATE employees SET dopay_full_name='Bassant Mohamed Abdel Nasser Mohamed Shaalan', national_id='29904160104126', dopay_mobile='+20 11 14301005', card_delivered='11 Dec 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01114301005' OR phone='+20 11 14301005') AND name ILIKE '%Passant%';

UPDATE employees SET dopay_full_name='Mariam Hany Elshahat Sayed Ahmed', national_id='30405101804849', dopay_mobile='+20 11 58186036', card_delivered='3 Dec 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01158186036' OR phone='+20 11 58186036') AND name ILIKE '%Mariam%';

UPDATE employees SET dopay_full_name='Abdel Rahman Mohamed Mostafa Abdel Aziz', national_id='29812072104092', dopay_mobile='+20 10 10826332', card_delivered='6 Nov 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01010826332' OR phone='+20 10 10826332') AND name ILIKE '%Abdalrhman%';

UPDATE employees SET dopay_full_name='Safinaz Mohamed Zaki Hussein', national_id='29411012412401', dopay_mobile='+20 10 62325856', card_delivered='28 Oct 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01062325856' OR phone='+20 10 62325856') AND name ILIKE '%Safaa%';

UPDATE employees SET dopay_full_name='Salma Hisham Mohamed Hussein Nassar', national_id='29612212101782', dopay_mobile='+20 11 13370067', card_delivered='28 Oct 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01113370067' OR phone='+20 11 13370067') AND name ILIKE '%Salma%';

UPDATE employees SET dopay_full_name='Omar Sherif Mohamed Elsayed Mohamed', national_id='30309302104439', dopay_mobile='+20 10 32624800', card_delivered='28 Oct 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01032624800' OR phone='+20 10 32624800') AND name ILIKE '%omar%';

UPDATE employees SET dopay_full_name='Taghreed Hassan Abdo Ali Ibrahim', national_id='28901030103184', dopay_mobile='+20 11 24711415', card_delivered='28 Oct 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01124711415' OR phone='+20 11 24711415') AND name ILIKE '%taghreed%';

UPDATE employees SET dopay_full_name='Akram Khaled Saied Ali', national_id='29812102102618', dopay_mobile='+20 11 15558867', card_delivered='28 Oct 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01115558867' OR phone='+20 11 15558867') AND name ILIKE '%Akram%';

UPDATE employees SET dopay_full_name='Ziad Mohamed Ali Mohamed', national_id='29904072101478', dopay_mobile='+20 11 45573672', card_delivered='28 Oct 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01145573672' OR phone='+20 11 45573672') AND name ILIKE '%Zeyad%';

UPDATE employees SET dopay_full_name='Ahmed Saied Nasr Abdel Kawy', national_id='29706252301916', dopay_mobile='+20 11 53138359', card_delivered='28 Oct 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01153138359' OR phone='+20 11 53138359') AND name ILIKE '%Ahmed Saied%';

UPDATE employees SET dopay_full_name='Mohamed Sabry Hassan Ali', national_id='30609202106195', dopay_mobile='+20 11 23122611', card_delivered='28 Oct 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01123122611' OR phone='+20 11 23122611') AND name ILIKE '%Mohamed Sabry%';

UPDATE employees SET dopay_full_name='Mohab Magdy Sayed Shehata', national_id='29607232104997', dopay_mobile='+20 11 13481045', card_delivered='28 Oct 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01113481045' OR phone='+20 11 13481045') AND name ILIKE '%Mohab%';

UPDATE employees SET dopay_full_name='Mirna Mahmoud Abdel Raouf Ewiss', national_id='29907190103484', dopay_mobile='+20 11 18729407', card_delivered='28 Oct 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01118729407' OR phone='+20 11 18729407') AND name ILIKE '%Merna%';

UPDATE employees SET dopay_full_name='Asmaa Mohamed Ahmed Abdel Wahab Youssef', national_id='29505012108609', dopay_mobile='+20 11 55563488', card_delivered='28 Oct 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01155563488' OR phone='+20 11 55563488') AND name ILIKE '%Asmaa%';

UPDATE employees SET dopay_full_name='Mahmoud Khaled Saied Ali', national_id='29005260104056', dopay_mobile='+20 10 18577857', card_delivered='28 Oct 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01018577857' OR phone='+20 10 18577857') AND name ILIKE '%Mahmoud marley%';

UPDATE employees SET dopay_full_name='William Wadie Wahba Ibrahim', national_id='27110221400811', dopay_mobile='+20 12 22860580', card_delivered='28 Oct 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01222860580' OR phone='+20 12 22860580') AND name ILIKE '%William%';

UPDATE employees SET dopay_full_name='Abdel Rahman Abdel Fattah Siam Abdallah', national_id='29705182103139', dopay_mobile='+20 11 14873296', card_delivered='28 Oct 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01114873296' OR phone='+20 11 14873296') AND name ILIKE '%abdelrhman abdelfatah%';

UPDATE employees SET dopay_full_name='Maryam Mohamed Ali Maghnam', national_id='30202211900209', dopay_mobile='+20 10 24875152', card_delivered='28 Oct 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01024875152' OR phone='+20 10 24875152') AND name ILIKE '%Mariem%';

UPDATE employees SET dopay_full_name='Mohamed Gamal Bakry Abdel Aaty', national_id='29012182101653', dopay_mobile='+20 10 07214115', card_delivered='28 Oct 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01007214115' OR phone='+20 10 07214115') AND name ILIKE '%Mohamed gamal%';

UPDATE employees SET dopay_full_name='Mahmoud Ahmed Elbadawy Mahmoud Ahmed Elmaghraby', national_id='29510180102571', dopay_mobile='+20 10 60549935', card_delivered='28 Oct 2025', payment_method='dopay', track_attendance=true
WHERE (phone='01060549935' OR phone='+20 10 60549935') AND name ILIKE '%Elbadawy%';

-- STEP 3: Insert Ahmed the Driver
INSERT INTO employees (
  name, dopay_full_name, national_id, phone, dopay_mobile,
  card_delivered, payment_method, employee_type_v2, track_attendance, status,
  employee_code, avatar, salary, role
)
SELECT
  'Ahmed Saied Nasr Abdel Kawy',
  'Ahmed Saied Nasr Abdel Kawy',
  '29706252301916',
  '01153138359',
  '+20 11 53138359',
  '28 Oct 2025',
  'dopay',
  'driver',
  false,
  'active',
  'EMP' || LPAD(((SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code FROM 4) AS INTEGER)), 0) FROM employees WHERE employee_code ~ '^EMP[0-9]+$') + 1)::TEXT, 3, '0'),
  'AH',
  0,
  'employee'
WHERE NOT EXISTS (
  SELECT 1 FROM employees WHERE phone = '01153138359'
);

-- STEP 4: Verify
SELECT name, dopay_full_name, national_id, payment_method, employee_type_v2, track_attendance
FROM employees
WHERE dopay_full_name IS NOT NULL
ORDER BY name;
