-- Imports the QA-Report-Bookme.xlsx bugs. DESTRUCTIVE: empties every table except users
-- run migrations/2026-10-04_per_project_bug_numbers.sql first
-- needs at least one Admin user, who is shown as the reporter of every bug
-- all in one transaction, so a failure leaves the database as it was

BEGIN;

TRUNCATE TABLE
  bug_assignment_log, bug_attachments, bug_status_history, bugs, dashboard_daily_metrics,
  invitations, modules, notification_log, password_resets, projects, releases,
  requirement_test_case_links, requirements, test_case_release_links, test_cases, test_executions
RESTART IDENTITY CASCADE;

-- projects

insert into projects (name, slug, created_by) values ('Bookme.pk', 'bookme-pk', (select id from users where role = 'Admin' order by id limit 1));
insert into projects (name, slug, created_by) values ('Jeeny', 'jeeny', (select id from users where role = 'Admin' order by id limit 1));
insert into projects (name, slug, created_by) values ('Indrive', 'indrive', (select id from users where role = 'Admin' order by id limit 1));
insert into projects (name, slug, created_by) values ('Bookme.sa', 'bookme-sa', (select id from users where role = 'Admin' order by id limit 1));

-- modules

insert into modules (name, created_by, project_id) values ('Flights', (select id from users where role = 'Admin' order by id limit 1), (select id from projects where slug = 'bookme-pk'));
insert into modules (name, created_by, project_id) values ('Buses', (select id from users where role = 'Admin' order by id limit 1), (select id from projects where slug = 'bookme-pk'));
insert into modules (name, created_by, project_id) values ('Hotels', (select id from users where role = 'Admin' order by id limit 1), (select id from projects where slug = 'bookme-pk'));
insert into modules (name, created_by, project_id) values ('Upcoming Trips', (select id from users where role = 'Admin' order by id limit 1), (select id from projects where slug = 'bookme-pk'));
insert into modules (name, created_by, project_id) values ('Account and Auth', (select id from users where role = 'Admin' order by id limit 1), (select id from projects where slug = 'bookme-pk'));
insert into modules (name, created_by, project_id) values ('Car Rental', (select id from users where role = 'Admin' order by id limit 1), (select id from projects where slug = 'bookme-pk'));
insert into modules (name, created_by, project_id) values ('Tours', (select id from users where role = 'Admin' order by id limit 1), (select id from projects where slug = 'bookme-pk'));
insert into modules (name, created_by, project_id) values ('Events', (select id from users where role = 'Admin' order by id limit 1), (select id from projects where slug = 'bookme-pk'));
insert into modules (name, created_by, project_id) values ('Visa', (select id from users where role = 'Admin' order by id limit 1), (select id from projects where slug = 'bookme-pk'));
insert into modules (name, created_by, project_id) values ('Umrah', (select id from users where role = 'Admin' order by id limit 1), (select id from projects where slug = 'bookme-pk'));
insert into modules (name, created_by, project_id) values ('Wallet and Payments', (select id from users where role = 'Admin' order by id limit 1), (select id from projects where slug = 'bookme-pk'));
insert into modules (name, created_by, project_id) values ('Flights', (select id from users where role = 'Admin' order by id limit 1), (select id from projects where slug = 'jeeny'));
insert into modules (name, created_by, project_id) values ('General', (select id from users where role = 'Admin' order by id limit 1), (select id from projects where slug = 'jeeny'));
insert into modules (name, created_by, project_id) values ('Wallet and Payments', (select id from users where role = 'Admin' order by id limit 1), (select id from projects where slug = 'jeeny'));
insert into modules (name, created_by, project_id) values ('Tours', (select id from users where role = 'Admin' order by id limit 1), (select id from projects where slug = 'jeeny'));

-- bugs, numbered from 1 inside each project

insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 1, $q$Total Fare Mismatch Between Flight Selection and Passenger Details because in saudia airline automatially baggage has been added$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Flights')), 'Critical', NULL, 'Closed', $q$LIVE APP$q$,
  $q$1. Search for a round-trip journey:
      AMM → RUH — 26 Sep
      RUH → AMM — 27 Sep
2. Select the departure flight:
3. Departure: 01:25 AM
4. Arrival: 06:50 AM
5. Package: Basic — No additional charge
6. Flight Price: PKR 119,298
7. Select the direct return flight:
      Route: RUH → AMM
      Departure: 12:05 PM
      Arrival: 02:25 PM
8. Package: Saver ECO
9. Baggage: +PKR 5,041                                                                                                                                  10. Observe the Total Fare displayed on the flight selection screen.
11. Proceed to the Passenger Details screen without manually adding any additional services.
Observe the Total Fare displayed again.$q$, $q$The total fare displayed during flight selection is incorrect and does not match the amount displayed after proceeding to the passenger details screen$q$, NULL, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-25 00:00:00+05', '2026-09-25 00:00:00+05', $q$Evidence: Bookme-Fare.mp4
Remarks: Repeated in the Bookme live & Widget
Assignee: Usama
Original status: Duplicate$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 2, $q$Selected Seat Information Not Completely Reflected in Itinerary$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Flights')), 'High', NULL, 'Retest', $q$LIVE APP$q$,
  $q$Search for the journey:AMM  to RUH two way
AMM → DOH
DOH → RUH
RUH → JED
JED → AMM
For AMM → DOH, select Royal Jordanian and manually select seat 14D.
For DOH → RUH, select Qatar Airways. No seat is selected because seats are unavailable.
For RUH → JED, select Saudia and seat 36J.
For JED → AMM, select seat 35B.
Complete the booking flow.
Open the final itinerary.
Check the seat information displayed for each flight segment.$q$, $q$Only the departure seat information is displayed in the itinerary. The selected seats for the remaining applicable segments, including 36J and 35B, are missing.$q$, $q$The itinerary should accurately display the seat information for all segments where a seat was selected/assigned.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-25 00:00:00+05', '2026-09-25 00:00:00+05', $q$Evidence: BUG.mp4
Resolution: Qatar Airways , Royal Jordainian & Qatar airways combo still issue is persisiting
Assignee: Bilal Haider$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 3, $q$Flight Cards Repeatedly Appearing/Duplicating in Multicity Legacy Flow$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Flights')), 'Critical', NULL, 'Closed', $q$LIVE APP$q$,
  $q$Navigate to the Multicity Legacy flight flow.
Enter the required multicity journey details.
Search for available flights.
Observe the flight cards displayed.$q$, $q$Flight cards repeatedly appear/duplicate in the Multicity Legacy flow.$q$, $q$Each available flight should be displayed only once without unnecessary duplication.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-25 00:00:00+05', '2026-09-25 00:00:00+05', $q$Evidence: Cards-Dup.mp4
Assignee: Bilal Haider
Resolved on: 2026-09-25$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 4, $q$PNR and Booking Reference Missing After Ticket Confirmation$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Flights')), 'High', NULL, 'Open', $q$LIVE APP$q$,
  $q$----------$q$, $q$The tickets are confirmed, but both the PNR and Booking Reference are still missing on the Bookme Live app.$q$, $q$PNR and Booking Reference should be displayed after successful ticket confirmation.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-25 00:00:00+05', '2026-09-25 00:00:00+05', $q$Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 5, $q$Payment
Payment is getting declined while booking the Sea Rose bus for Sahiwal → LHE, one-way, on 4 Oct.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Buses')), 'Critical', NULL, 'Closed', $q$LIVE APP$q$,
  $q$1. Search for a one-way bus from Sahiwal to LHE for 4 Oct.
2. Select Sea Rose bus.
3. Proceed to passenger details and payment.
4. Select Debit/Credit Card as the payment method.
5. Attempt to complete the payment.$q$, $q$Payment is declined, preventing the booking from being completed.$q$, $q$Payment should be processed successfully, and the bus booking should be confirmed.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-28 00:00:00+05', '2026-09-28 00:00:00+05', $q$Evidence: PaymentFailedBus.mp4
Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 6, $q$Premier Inn Mall Lahore has an image available on Google, but no hotel image is displayed on Jeeny Live / Bookme Live$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Hotels')), 'Medium', NULL, 'Open', $q$live web & app$q$,
  $q$1. Open Hotels module
2. Search for Premier Inn Mall Lahore
3. Check the hotel listing
4. Compare the displayed information with the hotel's available Google listing$q$, $q$No image is displayed for Premier Inn Mall Lahore$q$, $q$Hotel image should be displayed on the hotel listing$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-29 00:00:00+05', '2026-09-29 00:00:00+05', $q$Evidence: HotelImageIssue.jpeg
Assignee: Usama
Original status: Pending$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 7, $q$Baggage is being added automatically on the Add-ons screen, causing a fare discrepancy. Route: AMM → RUH (26 Oct), RUH → AMM (28 Oct) Trip Type: Multi-City Airline: Saudia$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Flights')), 'High', NULL, 'Reopened', $q$LIVE APP$q$,
  $q$1. Search for the mentioned Multi-City / One Way route.
2. Select Saudia flights
3. Proceed to the Add-ons screen.
4. Check the baggage selection and fare.$q$, $q$Baggage is automatically added on the Add-ons screen, which causes a change/disruption in the fare.$q$, $q$Baggage should not be added automatically. The fare should remain unchanged unless the user manually selects an additional baggage option.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-01 00:00:00+05', '2026-10-01 00:00:00+05', $q$Evidence: Baggage-Auto-issue.mp4
Resolution: 
Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 8, $q$Seat selection details are showing for only one segment after payment, even though seats were manually selected for all segments. Route: AMM → RUH → AMM Trip Type: Round Trip Travel Dates: 9–10 Oct$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Flights')), 'High', NULL, 'Reopened', $q$LIVE APP$q$,
  $q$1. Search for AMM → RUH → AMM for 9–10 Oct.
2. Select a flight and proceed to seat selection.
3. Manually select seats for all available segments.
4. Complete the booking and payment.
5. Open the booking itinerary and check the Seat Selection details.$q$, $q$After payment, the itinerary is showing seat selection details for only one segment, while seats were manually selected for all segments.$q$, $q$The itinerary should display the selected seat details for all segments of the round trip.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-01 00:00:00+05', '2026-10-01 00:00:00+05', $q$Evidence: SeatSelectionIssueofSegments.mp4
Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 9, $q$An error message appears when selecting the baggage option for the second segment of a round-trip booking. Route: AMM → RUH → AMM Trip Type: Round Trip Airline: Saudia$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Flights')), 'Critical', NULL, 'Closed', $q$LIVE APP$q$,
  $q$1. Search for AMM → RUH as a Round Trip.
2. Select Saudia for the first leg: 01:25 PM – 03:45 PM.
3. Select Saver Eco + Baggage for the first leg.
4. For the second leg, select Saudia: 02:30 AM – 12:10 PM.
5. Select Saver Eco + Baggage for the second leg.$q$, $q$Error message appear related to the combination of  segments --- similar to the jeeny session timeout issue$q$, $q$The baggage option should be selected successfully for both segments without any error.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-01 00:00:00+05', '2026-10-01 00:00:00+05', $q$Evidence: SimilarIssuetoJeeny.mp4
Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 10, $q$Fare is displayed inconsistently between the first and second flight cards, although the final fare calculation is correct. Route: LHE → Toronto (YTZ) Travel Dates: 15–16 Oct Airlines: Air Canada + Emirates$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Flights')), 'High', NULL, 'Closed', $q$LIVE APP$q$,
  $q$1. Search for LHE → Toronto (YTZ) for 15–16 Oct.
2. Check the fare displayed on the first flight card.
3. Check the fare displayed on the second flight card 
4. Proceed further and verify the fare calculation.$q$, $q$The first flight card displays PKR 619,160, while the second flight card displays PKR 309,580. However, the final fare calculation is correct.$q$, $q$The fare displayed on each flight card should be consistent and accurately represent the fare for the itinerary.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-01 00:00:00+05', '2026-10-02 00:00:00+05', $q$Evidence: PriceUpdatedWrongFE.mp4
Resolution: Logical Mistake in code
Assignee: Ali
Resolved on: 2026-10-02$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 11, $q$Hotel search is inconsistent due to case sensitiivty in the hotel/destination name, which may confuse users.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Hotels')), 'Medium', NULL, 'Open', $q$live web & app$q$,
  $q$1. Open the Bookme mobile app.
2. Search for “Istanbul” in the hotel search.
3. Observe the search results.
4. Search for “istanbul” instead.
5. Compare the results$q$, NULL, $q$The search should be case-insensitive, so searches with small or capital letters should return the same relevant hotel results.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-01 00:00:00+05', '2026-10-01 00:00:00+05', $q$Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 12, $q$Previous round-trip booking data is retained in the invoice, itinerary, and ticket PDF after changing the trip type to one-way and making a new booking.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Buses')), 'Critical', NULL, 'Closed', $q$LIVE APP$q$,
  $q$1. Search for Sahiwal → Lahore as a Round Trip.
2. Select an outbound seat.
3. Edit the search and change the trip type to One Way.
4. A discard popup appears; discard the previous outbound seat/search data.
5. Search for Sahiwal → Lahore again as a One Way trip.
6. Complete the booking and proceed to payment.
7. Check the payment summary, invoice, itinerary, and ticket PDF.$q$, $q$The payment screen shows the correct summary for one ticket, but the invoice shows payment details for two tickets. The itinerary and ticket PDF also contain records/details of two tickets, including data from the previous Round-Trip booking.$q$, $q$The new One-Way booking should contain details for only one ticket across the payment summary, invoice, itinerary, and ticket PDF. Previous Round-Trip/seat data should not be retained.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-02 00:00:00+05', '2026-10-02 00:00:00+05', $q$Evidence: ticketissuebus.mp4
Remarks: It is from backend. Qaiser bhai and Usman will look into it
Assignee: Qaiser
Resolved on: 2026-10-02$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 13, $q$The remaining days shown for upcoming trips are different on Bookme Web Live and the Live Mobile App.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Upcoming Trips')), 'Medium', NULL, 'Open', $q$live web & app$q$,
  $q$Log in to Bookme Web Live.
Go to Upcoming Trips.
Note the “days to go” displayed for the upcoming trips.
Open the Bookme Mobile App Live.
Go to Upcoming Trips.
Compare the displayed “days to go” with the Web.$q$, $q$On Bookme Web Live, it shows “4 days to go” and “7 days to go,” while on the Live Mobile App, it shows “5 days to go” and different remaining-day counts.$q$, $q$The same number of remaining days should be displayed on both Web and Mobile App.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-02 00:00:00+05', '2026-10-02 00:00:00+05', $q$Remarks: Muneeb will fix it
Assignee: Munib
Original status: Pending$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 14, $q$A number is appearing underneath the Daewoo Bus name on the bus listing.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Buses')), 'Low', NULL, 'Closed', $q$LIVE APP$q$,
  $q$Login Bookme Live.
Go to the Bus module.
Search for an available route with Daewoo Bus.
Check the bus listing.$q$, $q$------$q$, $q$-----------$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-02 00:00:00+05', '2026-10-02 00:00:00+05', $q$Evidence: ---------
Assignee: Awais
Resolved on: 2026-10-02$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 15, $q$The displayed distance for the Iqbalabad → chowk bahadur route appears to be incorrect.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Buses')), 'Medium', NULL, 'Closed', $q$live web & app$q$,
  $q$login Bookme Live.
Go to the Bus module.
Search for route iqbalabad to chowk bahadur$q$, $q$------$q$, $q$-----------$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-02 00:00:00+05', '2026-10-02 00:00:00+05', $q$Evidence: ---------
Assignee: Awais
Resolved on: 2026-10-02$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 16, $q$The first image of every room is missing from the room images section.Regency Suites Hotel
Location: Al Rehman Plaza, 48 Baloch Road, Gulberg 3, Lahore$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Hotels')), 'Medium', NULL, 'Closed', $q$live web & app$q$,
  $q$login Bookme Live.
Go to the hotel module.
Search for the llahore hotels (Regency suites) and observe the room images$q$, $q$------$q$, $q$-----------$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-02 00:00:00+05', '2026-10-02 00:00:00+05', $q$Evidence: HotelImageIssue.jpeg
Assignee: Usama
Resolved on: 2026-10-02$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 17, $q$While booking a round-trip Saudia flight from AMM to RUH, selecting the Saudia flight for both legs results in an error.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Flights')), 'High', NULL, 'Open', NULL,
  $q$Selected Flights:

Leg 1: AMM → RUH — 10:20 PM to 12:30 AM (+1)
Leg 2: RUH → AMM — 6:00 AM to 12:15 PM
Airline: Saudia

Steps to Reproduce:

Search for AMM → RUH.
Select 26 Oct – 27 Oct and choose Round Trip.
Select a Saudia flight for the outbound leg.
Select the Saudia flight for the return leg.
Proceed to continue/booking.$q$, $q$------$q$, $q$-----------$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-02 00:00:00+05', '2026-10-02 00:00:00+05', $q$Evidence: https://drive.google.com/file/d/12sC-xYz-wzDstpn4VV5nCZj6oNsfFnKU/view?usp=sharing
Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 18, $q$Hotels are being displayed in the search results even when none of the available rooms can accommodate the selected guest configuration.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Hotels')), 'High', NULL, 'Open', $q$LIVE APP$q$,
  $q$Login Bookme Live 
Go to the Hotels module.
Select Lahore as the destination.
Select the required check-in and check-out dates.
Set the guest configuration to 3 Adults + 3 Children.
Search for hotels.
Open any hotel listed in the search results. Interact with the hotels
Check the available room options.
Observe that no available room notification will be showed$q$, $q$Hotels are listed even though they cannot accommodate the selected number of guests.$q$, $q$Hotels should only be listed if they have at least one available room or valid room combination that can fulfill the selected occupancy requirements.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-02 00:00:00+05', '2026-10-02 00:00:00+05', $q$Evidence: HotelsRoomAvailibiltyIssueRec.mp4
Remarks: The hotel search/availability logic should validate the guest count against the actual room occupancy before displaying the hotel in search results. If no room or valid room combination can accommodate the selected guests, the hotel should not be shown as an available result.

Alternatively, if the hotel needs to remain visible for discovery, it should be clearly marked as “No rooms available for selected guests” rather than appearing as bookable.
Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 19, $q$Unable to register into the uat bookme.pk$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Account and Auth')), 'Critical', NULL, 'Closed', $q$UAT WEB$q$,
  $q$Enter the required credentials and click the registeration btn$q$, $q$User is unable to register$q$, $q$User should sucessfully registered into the web$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-02 00:00:00+05', '2026-10-02 00:00:00+05', $q$Evidence: registerEror.jpeg
Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 20, $q$The Call option in the Forgot Password flow is throwing an Internal Server Error.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Account and Auth')), 'Medium', NULL, 'Open', $q$live web & app$q$,
  $q$Go to the Forgot Password screen.
Enter a valid registered phone number.
Select the Call option to receive the verification code.$q$, $q$An Internal Server Error is displayed, and the call-based password recovery flow does not proceed.$q$, $q$The Call option should successfully initiate the verification call and allow the user to proceed with password recovery.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-05 00:00:00+05', '2026-10-05 00:00:00+05', $q$Evidence: callOptFPIssue.jpeg
Remarks: It was a ripple effect of the recent vulnerability assessment. As per Sir Umar's explanation, generic error messages were introduced as a security recommendation. Also, the architecture changed: earlier the FE called the BE directly, but now a middle layer (proxy) sits in between (FE → middle layer → BE → middle layer → FE), which is why the BE's specific response was not reaching the FE.
Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 21, $q$OTP is not received when attempting to delete an account.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Account and Auth')), 'High', NULL, 'Closed', $q$live web & app$q$,
  $q$Go to Personal Information.
Select Delete Account.
Proceed with the account deletion process.
The system asks the user to enter an OTP.
Check the registered email address and phone number.$q$, $q$No OTP is received on either the registered email or phone number.$q$, $q$The OTP should be successfully sent to the user's registered email address and/or phone number so the account deletion process can be completed.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-05 00:00:00+05', '2026-10-05 00:00:00+05', $q$Remarks: We will look into it latter cuz there must be the problem but for now its seems right
Assignee: Munib
Original status: Rejected$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 22, $q$On the Bookme Live Web, while searching for flights from Riyadh to London, the Air Arabia and ValueAir airline icons are not visible in Dark Mode. The icons are displayed correctly when the website is switched to Light Mode.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Flights')), 'Medium', NULL, 'Open', $q$LIVE WEB$q$,
  $q$Open the Bookme Live Web.
Switch the website to Dark Mode.
Search for flights from Riyadh to London.
Locate flights operated by Air Arabia and ValueAir.
Observe the airline icons.
Switch the website to Light Mode.
Compare the airline icons in both modes$q$, $q$Air Arabia and ValueAir airline icons are not visible in Dark Mode, while both icons are displayed correctly in Light Mode.$q$, $q$Air Arabia and ValueAir airline icons should be clearly visible in both Dark Mode and Light Mode.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-05 00:00:00+05', '2026-10-05 00:00:00+05', $q$Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 23, $q$Timer on the Agree button in the Car Rental module is not functioning properly.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Car Rental')), 'Critical', NULL, 'Retest', $q$LIVE APP$q$,
  $q$Go to the Car Rental module.
Select the required conditions as per your choice.
Select any available car.
Open and interact with each car policy.
Proceed to the next step.
At the Agree button, observe the timer.$q$, $q$The timer should continue counting down normally and allow the user to proceed once the required time is completed.$q$, $q$The timer gets stuck/frozen and does not continue counting down.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-05 00:00:00+05', '2026-10-05 00:00:00+05', $q$Evidence: CarRentalIssue.mp4
Assignee: Ali$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 24, $q$Tour images are missing from the Tours vertical.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Tours')), 'Medium', NULL, 'Closed', $q$LIVE APP$q$,
  $q$1. Open the Bookme Tours vertical.

2. Search or browse available tours.

3. Check the tour listings/cards.

4. Observe that the tour images are missing.$q$, $q$Tour images are not displayed in the Tours vertical.$q$, $q$All tour listings should display their respective images correctly.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-05 00:00:00+05', '2026-10-05 00:00:00+05', $q$Evidence: TourImageIssue.jpeg
Assignee: Awais
Resolved on: 2026-10-05$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 25, $q$Attendee count is being carried over between different categories.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Events')), 'Medium', NULL, 'Closed', $q$LIVE APP$q$,
  NULL, $q$When X number of people is added in one category (e.g., Adults = 5), the same count is carried over to another category (e.g., Children = 5) instead of starting from 1.$q$, $q$If the user adds X number of people in one category, for example Adults = 5, the same count should not automatically appear when switching to another category such as Children.        Each category should start with a default count of 1 when selected, instead of carrying forward the count from the previously selected category.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-05 00:00:00+05', '2026-10-05 00:00:00+05', $q$Evidence: ---------------------
Assignee: Ali$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 26, $q$Voucher is visible and can be applied to a discounted event ticket.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Events')), 'High', NULL, 'Closed', $q$LIVE APP$q$,
  $q$Go to the Prime Minister Youth Programme event.
Enter the required participant details.
Apply the available voucher.
Click on Proceed to Payment.
Observe the response.
Repeat the payment attempt.$q$, $q$On the first two attempts, a “Service Not Available” error was displayed.
On the third attempt, the voucher became disabled.
After discussing with Ali, it was clarified that vouchers should not be visible/applicable for already discounted event tickets.$q$, $q$vouchers should not be visible/applicable for already discounted event tickets.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-05 00:00:00+05', '2026-10-05 00:00:00+05', $q$Assignee: Ali
Resolved on: 2026-10-05$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 27, $q$The Visa Expiry Date should be at least 6 months ahead of the current date.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Visa')), 'High', NULL, 'Closed', $q$LIVE APP$q$,
  $q$-$q$, $q$------$q$, $q$-----------$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-05 00:00:00+05', '2026-10-05 00:00:00+05', $q$Assignee: Ali
Resolved on: 2026-10-05$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 28, $q$Something went wrong on flight airblue Route: LHE → JED
Airline: Airblue
Travel Date: 13 Oc$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Flights')), 'High', NULL, 'Open', $q$live web & app$q$,
  $q$Route: LHE → JED
Airline: Airblue
Travel Date: 13 Oc$q$, $q$While proceeding with the booking, a “Something went wrong” error is displayed, preventing the user from proceeding.$q$, $q$The booking process should proceed successfully without displaying an unexpected error.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-05 00:00:00+05', '2026-10-05 00:00:00+05', $q$Resolution: The issue was caused by an invalid passport number format, which prevented the payment from being processed. However, instead of showing the actual validation error, the system displayed a generic error. Proper validation and error handling should be implemented to clearly indicate the issue to the user.
Assignee: Usama$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 29, $q$Customize umrah pakage is not available on web live$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Umrah')), 'High', NULL, 'Closed', $q$LIVE WEB$q$,
  $q$--$q$, $q$------$q$, $q$---$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-05 00:00:00+05', '2026-10-05 00:00:00+05', $q$Assignee: Munib
Original status: Rejected$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 30, $q$While booking a Customised Umrah Package, after entering the passenger details such as name, passport number, etc., the user proceeds to the Arrival Flight section. After selecting the Airblue Value flight for 13 Oct 2026 (11:35 PM – 03:15 AM) and selecting the required baggage, clicking “Go to Add-ons” does not navigate to the Add-ons screen. Instead, the page remains stuck on the Bookme loading screen, preventing the user from proceeding with the booking.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Umrah')), 'Critical', NULL, 'Closed', $q$LIVE WEB$q$,
  $q$Open the Customised Umrah Package flow.
Enter the required user/passenger details, including name and passport number.
Proceed to the Arrival Flight section.
Select the Airblue Value flight for 13 Oct 2026, 11:35 PM – 03:15 AM.
Select the required baggage.
Click “Go to Add-ons.”
Observe the screen.$q$, $q$The user remains stuck on the Bookme loading screen and the Add-ons screen does not load.$q$, $q$After clicking “Go to Add-ons,” the user should be successfully navigated to the Add-ons screen.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-05 00:00:00+05', '2026-10-05 00:00:00+05', $q$Evidence: umrahIssue.mp4
Assignee: Ali
Resolved on: 2026-10-05$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 31, $q$User does not receive the OTP when attempting to delete the account$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Account and Auth')), 'High', NULL, 'Open', $q$live web & app$q$,
  $q$---$q$, $q$User does not receive the OTP when attempting to delete the account.$q$, $q$user should sucessfully recicve the otp trhough whatsapp/phone/email$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-05 00:00:00+05', '2026-10-05 00:00:00+05', $q$Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 32, $q$After logging into an unblocked account and then trying to log in with the previously blocked account, the blocked message displayed an incorrect phone number instead of the actual blocked account number.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Account and Auth')), 'Medium', NULL, 'Closed', NULL,
  NULL, NULL, NULL, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-06 00:00:00+05', '2026-10-06 00:00:00+05', $q$Assignee: Ali
Resolved on: 2026-10-06$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 33, $q$While making a booking for Army Museum in the Events vertical, a single booking is being created successfully, but two duplicate bookings are displayed under My Bookings for the same transaction.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Events')), 'Medium', NULL, 'Closed', NULL,
  NULL, NULL, NULL, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-06 00:00:00+05', '2026-10-06 00:00:00+05', $q$Assignee: Usman
Resolved on: 2026-10-06
Priority was blank in the Excel, severity set to Medium$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 34, $q$On the mobile app, users cannot add an amount less than Rs. 10, whereas on the web, they can add any amount below Rs. 10. There is a logical inconsistency between both platforms and the behavior should be aligned as per the requirement.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Wallet and Payments')), 'Medium', NULL, 'Open', $q$live web & app$q$,
  NULL, NULL, NULL, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-06 00:00:00+05', '2026-10-06 00:00:00+05', $q$Assignee: Munib
Priority was blank in the Excel, severity set to Medium$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 35, $q$Tour filters not working consistently across Web and Mobile$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Tours')), 'High', NULL, 'Closed', $q$live web & app$q$,
  $q$Navigate to the Tours section on Web.
Apply any available tour filter.
Observe the search results.
Apply the same filter(s) on the Mobile App.
Compare the results.$q$, $q$Web: No tour results are displayed after applying the filter(s).
Mobile: Tour results are displayed for the same filter criteria.$q$, $q$The same filter criteria should return consistent and relevant tour results across both Web and Mobile platforms.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-07 00:00:00+05', '2026-10-07 00:00:00+05', $q$Assignee: Ali
Resolved on: 2026-10-07$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 36, $q$The bus booking payment is being declined during the payment process. In the first payment attempt, the JazzCash OTP was received but was not entered. After that, when attempting to pay again through Pay Now or by creating a new booking, the payment failed and no OTP was received on subsequent attempts.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Buses')), 'Critical', NULL, 'Open', $q$LIVE APP$q$,
  NULL, NULL, NULL, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-08 00:00:00+05', '2026-10-08 00:00:00+05', $q$Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 37, $q$While making a payment for the Army Museum event using JazzCash, the payment is declined and no OTP is received.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Events')), 'Critical', NULL, 'Open', $q$LIVE APP$q$,
  NULL, NULL, NULL, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-08 00:00:00+05', '2026-10-08 00:00:00+05', $q$Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'bookme-pk'), 38, $q$In the Packages module, after the payment is successfully confirmed, the booking continues to show "Expired" status for some time. During this period, the booking listing also displays an active timer, even though the payment has already been successfully completed.$q$, (select id from modules where project_id = (select id from projects where slug = 'bookme-pk') and lower(name) = lower('Umrah')), 'Medium', NULL, 'Open', $q$LIVE APP$q$,
  NULL, NULL, NULL, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-08 00:00:00+05', '2026-10-08 00:00:00+05', $q$Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'jeeny'), 1, $q$The 1st leg displays PKR 176,014, while the 2nd leg requires adding 0, resulting in an incorrect/buggy fare summary and total amount.$q$, (select id from modules where project_id = (select id from projects where slug = 'jeeny') and lower(name) = lower('Flights')), 'Critical', NULL, 'Closed', $q$UAT APP$q$,
  $q$1. Search for a round-trip flight from LHE → AMM for 15 Oct – 16 Oct.
2. Select the first-leg flight with a fare of PKR 19,000.Select the second-leg flight with a PKR 0 additional fare.
3. Check the Total Price Summary.
4. Proceed to enter the passenger details without selecting or adding any add-ons.
5. Observe the Total Price Summary again.$q$, $q$The Total Price Summary changes after entering the passenger details, even though no add-ons have been added. Also the total sum of both legs appears incorrectly in the summary on the screen before the passenger details.$q$, $q$The fare summary should correctly display the fare for both legs and calculate the accurate total amount automatically$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-25 00:00:00+05', '2026-09-25 00:00:00+05', $q$Evidence: Bug-Fare-summary.mp4
Remarks: Ripple effect — when fixed from one side, it breaks from another side. UAT & Live
Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'jeeny'), 2, $q$Session unexpectedly expires while the user is actively performing booking operations.$q$, (select id from modules where project_id = (select id from projects where slug = 'jeeny') and lower(name) = lower('General')), 'Critical', NULL, 'Reopened', $q$UAT & Live$q$,
  $q$-----$q$, $q$The session unexpectedly expires while the user is actively performing booking operations, displaying a Session Timeout message.$q$, $q$--------$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-25 00:00:00+05', '2026-09-25 00:00:00+05', $q$Evidence: SessionTimeOUT.mp4
Resolution: multi-city leg wise flow is pending, when finalize I will look into it
Remarks: fixed at UAT
Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'jeeny'), 3, $q$“Something went wrong” Error After Seat Selection on Multicity Flight$q$, (select id from modules where project_id = (select id from projects where slug = 'jeeny') and lower(name) = lower('Flights')), 'Critical', NULL, 'Reopened', $q$UAT APP$q$,
  $q$1. Search for a multicity journey:
2. LHE → AMM — 24 Oct
3. AMM → DOH — 28 Oct
4. DOH → LHE — 01 Nov
5. Select the required flights for all three legs.
6. Select a seat.
7. Click Next.
8. Observe the result.$q$, $q$A “Something went wrong” error appears after clicking Next, blocking the booking flow.$q$, $q$The user should successfully proceed to the next step after selecting a seat.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-25 00:00:00+05', '2026-09-25 00:00:00+05', $q$Evidence: somethingWentWrong.mp4
Remarks: Only exists at fly jinah verify it on the other airlines
Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'jeeny'), 4, $q$Flight Card Dropdown Does Not Load and Another Card Appears Below$q$, (select id from modules where project_id = (select id from projects where slug = 'jeeny') and lower(name) = lower('Flights')), 'High', NULL, 'Closed', $q$UAT APP$q$,
  $q$1. Open Jeeny UAT.
2. Navigate to the Flights module.
3. Search for a flight.
4. Go to the flight listing/results page.
5.Click the dropdown button on any flight card.
6. Observe the behavior.$q$, $q$The selected flight card does not expand properly, and another flight card appears from below instead.$q$, $q$The selected flight card should expand and display its relevant details when the dropdown button is clicked.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-27 00:00:00+05', '2026-09-27 00:00:00+05', $q$Evidence: Issue-multiCity.mp4
Assignee: Bilal Haider
Resolved on: 2026-09-27$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'jeeny'), 5, $q$Flight data is not displayed for a Multi-City itinerary, although Fly Jinnah flights are available for the same routes/dates in Round Trip.$q$, (select id from modules where project_id = (select id from projects where slug = 'jeeny') and lower(name) = lower('Flights')), 'Medium', NULL, 'Closed', $q$UAT & Live$q$,
  $q$1. Select Multi-City.
2. Select LHE → ISB for 11 Oct.
3. Select ISB → LHE for 12 Oct.
4. Search for flights.$q$, $q$No flight data is returned for the selected Multi-City itinerary. The same routes/dates return Fly Jinnah flight data in Round Trip.$q$, $q$Available flights should be displayed for both routes, including Fly Jinnah (08:00 AM – 09:25 AM).$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-28 00:00:00+05', '2026-09-28 00:00:00+05', $q$Evidence: Multi-CityIssueRec.mp4 SearchResult02.jpeg     SearchResult01.jpeg
Resolution: Fly Jinnah doesn't offer multi city in their web
Assignee: Umar Hayat
Original status: Rejected
Resolved on: 2026-09-28$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'jeeny'), 6, $q$Session timeout occurs after selecting multi-city flights, followed by a “Web Page Not Available” error, preventing the user from proceeding.$q$, (select id from modules where project_id = (select id from projects where slug = 'jeeny') and lower(name) = lower('Flights')), 'Critical', NULL, 'Closed', $q$UAT & Live$q$,
  $q$1. Select Multi-City.
2. Search LHE → RUH for 10 Oct.
3. Search RUH → DOH for 11 Oct.
4. Search DOH → USA for 24 Oct.
5. Select flights for all three segments and proceed.$q$, $q$Session times out after flight selection, followed by a “Web Page Not Available” error, preventing further progress.$q$, $q$User should be able to proceed to the next step without session timeout or page errors.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-28 00:00:00+05', '2026-09-29 00:00:00+05', $q$Evidence: webPage&SessionOut.mp4
Assignee: Bilal Haider
Resolved on: 2026-09-29$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'jeeny'), 7, $q$Applying a voucher results in a negative payable amount that appears to be deducted from the booking total.$q$, (select id from modules where project_id = (select id from projects where slug = 'jeeny') and lower(name) = lower('Wallet and Payments')), 'Critical', NULL, 'Closed', $q$UAT APP$q$,
  $q$1. Open the Jeeny UAT Widget.
2. Proceed with a booking until the payment/review stage.
3. Apply a valid voucher.
4. Observe the updated payable amount.$q$, $q$After applying the voucher, the calculation results in a negative amount, which is shown as a deduction from the booking total.$q$, $q$The voucher discount should not reduce the payable amount below 0. The final amount should be correctly calculated, with the minimum payable amount being 0.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-29 00:00:00+05', '2026-09-29 00:00:00+05', $q$Remarks: Riple
Assignee: Usama
Resolved on: 2026-09-29$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'jeeny'), 8, $q$No seats are available on one of the connecting flights for AMM → Dublin, but the booking flow still displays the “Select Seat” step. After proceeding to the reservation stage, a false seat-related flag is displayed in the itinerary.$q$, (select id from modules where project_id = (select id from projects where slug = 'jeeny') and lower(name) = lower('Flights')), 'High', NULL, 'Closed', $q$UAT APP$q$,
  $q$1. Search for a One-Way flight from AMM → Dublin for 17 Oct.
2. Select the connecting flight operated by Royal Jordanian + Qatar Airways (01:15 AM – 06:45 AM +1).
3. Proceed to the seat selection step.
4. Observe the seat availability for the connecting flight.
5. Proceed to the reservation stage.$q$, $q$The flow displays the “Select Seat” step even though no seats are available for one of the connecting flights. At the reservation stage, a false flag is raised under the seat information in the itinerary.$q$, $q$If no seats are available, that flight shouldn't availabl for seat reservation$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-29 00:00:00+05', '2026-09-29 00:00:00+05', $q$Evidence: SeatIssue.jpeg https://drive.google.com/file/d/1YKpTwXm4aAGWH56I_vnffe-NS-r54plV/view?usp=drive_link
Assignee: Bilal Haider
Resolved on: 2026-09-29$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'jeeny'), 9, $q$A “Something went wrong” error appears on the booking review screen for AirSial when special characters are entered in the passenger name field.$q$, (select id from modules where project_id = (select id from projects where slug = 'jeeny') and lower(name) = lower('Flights')), 'Medium', NULL, 'Closed', $q$UAT APP$q$,
  $q$1. Search and select an AirSial flight.
2. Proceed to the passenger details screen.
3. Enter special characters in the passenger name field.
4. Complete the required passenger details.
5. Proceed to the booking review screen.$q$, $q$A “Something went wrong” error appears on the booking review screen after special characters are entered in the passenger name field.$q$, $q$The system should either validate/restrict unsupported special characters during passenger details entry or handle them properly without causing an error at the booking review stage.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-29 00:00:00+05', '2026-09-30 00:00:00+05', $q$Assignee: Bilal Haider
Resolved on: 2026-09-30$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'jeeny'), 10, $q$Route: KHI → SHJ → RUH
Travel Dates: 01 Oct 2026 (KHI → SHJ), 04 Oct 2026 (SHJ → RUH)
Trip Type: Multi-City
Airline: SalamAir

After selecting baggage for both flights and filling in the passenger details, a “Something went wrong” popup appears when proceeding to the payment stage.$q$, (select id from modules where project_id = (select id from projects where slug = 'jeeny') and lower(name) = lower('Flights')), 'High', NULL, 'Fixed', $q$LIVE APP$q$,
  $q$1. Search for a Multi-City flight from KHI → SHJ → RUH.
2. Select SalamAir flights for both segments.
3. Select baggage for both flights.
4. Fill in the passenger details.
5. Proceed towards the payment stage.$q$, $q$A “Something went wrong” popup appears with the message: “We apologize for the inconvenience, but we are currently unable to make a reservation through SalamAir for you. Please try again.” The booking cannot proceed to payment.$q$, $q$User should be able to proceed to the payment stage and complete the booking successfully$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-29 00:00:00+05', '2026-09-29 00:00:00+05', $q$Evidence: https://drive.google.com/file/d/1M8PMAQ1R5mZ81wKq5Ug8Mfx2n1Vb8mb1/view?usp=sharing
Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'jeeny'), 11, $q$Route: LHE → RUH
Travel Dates: 15–16 Oct 2026$q$, (select id from modules where project_id = (select id from projects where slug = 'jeeny') and lower(name) = lower('Flights')), 'Critical', NULL, 'Reopened', $q$LIVE APP$q$,
  $q$1. Search for a flight from LHE → RUH for 15–16 Oct.
2. Select the required flight.
3. Proceed to the Review screen.
4. Check the displayed fare.$q$, $q$On the Review screen, the fare changes from PKR 1,986 to PKR 3,009, resulting in a PKR 1,023 price increase.$q$, $q$The fare should remain consistent with the price displayed during flight selection.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-30 00:00:00+05', '2026-09-30 00:00:00+05', $q$Evidence: fareSummaryAgain.mp4
Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'jeeny'), 12, $q$Route: LHE → AMM
Travel Dates: 15–16 Oct 2026
Trip Type: Round Trip
Airlines: Saudia + Flydubai/Emirates (Connecting Flights)

Blank screen is displayed on the Add-ons screen after selecting the flights.$q$, (select id from modules where project_id = (select id from projects where slug = 'jeeny') and lower(name) = lower('Flights')), 'High', NULL, 'Retest', $q$LIVE APP$q$,
  $q$1. Search for LHE → AMM for 15–16 Oct.
2. Select the available Saudia flight for the first leg.
3. Select the connecting Flydubai + Emirates flight for the second leg.
4. Proceed to the Add-ons screen.$q$, $q$A blank screen is displayed on the Add-ons screen.$q$, $q$The Add-ons screen should load successfully and display the available add-on options.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-09-30 00:00:00+05', '2026-09-30 00:00:00+05', $q$Evidence: AdonsBlankScreen.mp4
Remarks: Fixed at UAT. Retest and update the status
Assignee: Umar Hayat$q$);
insert into bugs (project_id, bug_number, title, module_id, severity, priority, status, environment_build,
  steps_to_reproduce, actual_result, expected_result, reported_by, reported_at, last_status_change_at, qa_comments)
values ((select id from projects where slug = 'jeeny'), 13, $q$When selecting No Passes for the Naran Hunza 11 Days Trip, the Adults count is initially set to 0. When the user clicks the "+" button once, the count increases to 2 instead of 1. The user then has to click the "-" button to bring the count back to 1.$q$, (select id from modules where project_id = (select id from projects where slug = 'jeeny') and lower(name) = lower('Tours')), 'Low', NULL, 'Open', $q$LIVE APP$q$,
  $q$Open the Tours section.
Select the Naran Hunza 11 Days Trip.
Select No Passes.
Go to the Adults count section.
Make sure the adult count is 0.
Click the "+" button once.
Observe the adult count.$q$, $q$The adult count increases from 0 to 2 after clicking the "+" button once.$q$, $q$The adult count should increase from 0 to 1 after clicking the "+" button once.$q$, (select id from users where role = 'Admin' order by id limit 1),
  '2026-10-07 00:00:00+05', '2026-10-07 00:00:00+05', $q$Assignee: Ali$q$);

-- bring each project counter up to its last number so new bugs continue from there

update projects p set bug_counter = coalesce((select max(bug_number) from bugs where project_id = p.id), 0);

COMMIT;
