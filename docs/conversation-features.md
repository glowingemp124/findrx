# FindRx updates from the client call

Mohammad Samara is the client. Ali Imran is building the prototype. This is the list of decisions taken from the call in `temp/updates.txt`, plus the follow-up notes, and whether each one is in the product.

## Done

1. The patient request is chat only. One medication. The side form is gone.
2. Posting does not ask for a code. The phone number is required so FindRx can text them and so they can look the request up later. The name is optional.
3. My requests asks for the phone number and a texted code. There is a Log out button so another number can be used.
4. The phone field has a country code. It defaults to the United States and accepts other countries.
5. Choosing delivery shows that any delivery fee is the pharmacy's, not FindRx's.
6. The search area is a Google map for any country. The patient searches an address or uses their current location. A circle shows the radius. The last stop on the slider is Any, with no mile limit. A count at the bottom of the map says how many pharmacies fall inside. Pharmacy locations are not shown.
7. Name and mobile number are labeled fields on that same map screen.
8. After a request is posted, that pin and radius are who gets it. The live page uses the same count.
9. Privacy Policy and Terms of Service open in a sheet on the current page.
10. Super admin has a Privacy & terms sidebar tab. Both documents use an HTML editor.
11. The FindRx fee can be $0. At $0 the patient connects without a payment page.
12. Request records are kept. The 24-hour deletion is gone.
13. Pharmacy hours save immediately. Name, NPI, address, phone, and compounding are sent to FindRx for review. Approve and decline are on the admin Pharmacies page, and again on that pharmacy's page.
14. The signed-in person's name and photo still save on their own.
15. The pharmacy portal does not talk about fees or payments. A connection is a connection.
16. A connected patient can report that the pharmacy did not have the medication. The pharmacy can reply. Admin can refund or deny it. The admin dashboard shows acceptance, unfulfilled, and denied rates.
17. The admin dashboard lists areas where a search ended with no pharmacy.
18. The pharmacy sidebar and dashboard link to Import medications. That page has a save form, a table of what was added, a CSV upload, and a sample CSV.
19. Joining FindRx does not create a sign-in. The pharmacy picks its location on a map. After a visit, admin creates the account and gets a one-time password.
20. NPI is checked by FindRx. There is no third-party verification API.
21. Texts work without adding the site to the home screen.
22. Staff stays in the admin portal.
23. The pharmacy can pause requests, and operating hours still gate the feed.
24. A pharmacy does not see the patient's name or number until they connect.
25. The Google Maps key is read from `.env`. It is not in source. `temp/` is gitignored.

## Not done

1. An admin assistant that answers questions about the metrics. Agreed as later, after the operating system is in place.
2. A tool that finds nearby pharmacies on Google Maps and drafts outreach. Same timing: after the system is operating.
3. Drawing a custom shape on the map, rather than a circle. The circle and Any replaced that.
4. A second compounding checkbox. Mohammad dropped it on the call.

## Count

25 done. 4 not done.
