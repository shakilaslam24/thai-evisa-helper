'use strict';

const ROLES = ['admin', 'manager', 'staff', 'accounts', 'partner'];

const LEAD_STATUSES = [
  'New Lead', 'Contacted', 'Follow-up Running', 'Interested',
  'Meeting Fixed', 'Converted', 'Not Interested', 'Closed',
];

const LEAD_PRIORITIES = ['Hot', 'Warm', 'Cold'];

const FILE_STATUSES = [
  'Draft', 'Documents Pending', 'Ready for Submission', 'Submitted',
  'Under Processing', 'Additional Documents Required', 'Interview Called',
  'Approved', 'Rejected', 'Delivered', 'Completed', 'Hold',
];

// Statuses that count as an open / in-flight file.
const ACTIVE_FILE_STATUSES = [
  'Draft', 'Documents Pending', 'Ready for Submission', 'Submitted',
  'Under Processing', 'Additional Documents Required', 'Interview Called', 'Hold',
];

const MEETING_TYPES = ['Office Visit', 'Phone Call', 'Video Call', 'Follow-up Meeting'];
const MEETING_STATUSES = ['Scheduled', 'Completed', 'Rescheduled', 'Cancelled'];
const PARTNER_STATUSES = ['Active', 'Inactive', 'Suspended'];
const PAYMENT_STATUSES = ['Unpaid', 'Partial Paid', 'Paid'];
const PAYMENT_METHODS = ['Cash', 'bKash', 'Nagad', 'Bank Transfer', 'Cheque', 'Card', 'Other'];
const CHECKLIST_STATUSES = ['Missing', 'Received', 'Not Required'];

const DEFAULT_SERVICES = [
  'Tourist Visa', 'Work Visa', 'Student Visa', 'Business Visa',
  'Tour Package', 'Work Package', 'B2B File', 'Custom Service',
];

const DEFAULT_LEAD_SOURCES = [
  'Facebook', 'WhatsApp', 'Call', 'Referral', 'Walk-in', 'Website', 'Other',
];

const DEFAULT_DOC_CATEGORIES = [
  'Passport Copy', 'NID', 'Photo', 'Bank Statement', 'Trade License', 'NOC',
  'Invitation Letter', 'Air Ticket', 'Hotel Booking', 'Visa Copy', 'Other',
];

const DEFAULT_COUNTRIES = [
  'Thailand', 'Malaysia', 'Singapore', 'Indonesia', 'Vietnam', 'Cambodia',
  'India', 'Nepal', 'Sri Lanka', 'Maldives', 'China', 'Japan', 'South Korea',
  'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Oman', 'Kuwait', 'Bahrain',
  'Turkey', 'Egypt', 'Jordan', 'Azerbaijan', 'Georgia', 'Uzbekistan',
  'United Kingdom', 'Ireland', 'Schengen', 'Germany', 'France', 'Italy',
  'Spain', 'Netherlands', 'Portugal', 'Poland', 'Romania', 'Croatia',
  'United States', 'Canada', 'Australia', 'New Zealand', 'South Africa',
];

const DEFAULT_CHECKLIST_ITEMS = [
  'Passport Copy', 'Photo', 'NID', 'Bank Statement', 'Air Ticket', 'Hotel Booking',
];

// Which roles may write to which module. Admin is implicitly allowed everywhere.
const WRITE_ACCESS = {
  leads:     ['admin', 'manager', 'staff'],
  followups: ['admin', 'manager', 'staff'],
  meetings:  ['admin', 'manager', 'staff'],
  customers: ['admin', 'manager', 'staff'],
  files:     ['admin', 'manager', 'staff'],
  partners:  ['admin', 'manager', 'staff'],
  documents: ['admin', 'manager', 'staff'],
  invoices:  ['admin', 'manager', 'accounts'],
  payments:  ['admin', 'manager', 'accounts'],
  settings:  ['admin'],
  users:     ['admin'],
};

module.exports = {
  ROLES, LEAD_STATUSES, LEAD_PRIORITIES, FILE_STATUSES, ACTIVE_FILE_STATUSES,
  MEETING_TYPES, MEETING_STATUSES, PARTNER_STATUSES, PAYMENT_STATUSES,
  PAYMENT_METHODS, CHECKLIST_STATUSES, DEFAULT_SERVICES, DEFAULT_LEAD_SOURCES,
  DEFAULT_DOC_CATEGORIES, DEFAULT_COUNTRIES, DEFAULT_CHECKLIST_ITEMS, WRITE_ACCESS,
};
