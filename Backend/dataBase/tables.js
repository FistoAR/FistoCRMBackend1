/**
 * Fisto CRM Database Schema Specification
 * Generated automatically on 2026-07-29T13:30:05.848Z
 */

const databaseSchema = {
  /**
   * Table: attendance
   */
  attendance: [
    {
      column: "id",
      type: "bigint(20)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "employee_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "login_date",
      type: "date",
      nullable: false,
      key: "MUL",
    },
    {
      column: "morning_in",
      type: "time",
      nullable: true,
      default: "NULL",
    },
    {
      column: "morning_out",
      type: "time",
      nullable: true,
      default: "NULL",
    },
    {
      column: "afternoon_in",
      type: "time",
      nullable: true,
      default: "NULL",
    },
    {
      column: "afternoon_out",
      type: "time",
      nullable: true,
      default: "NULL",
    },
    {
      column: "total_hours",
      type: "varchar(100)",
      nullable: true,
      default: "'0 seconds'",
    },
    {
      column: "status",
      type: "enum('INCOMPLETE','PARTIAL','COMPLETE')",
      nullable: true,
      default: "NULL",
      key: "MUL",
      extra: "STORED GENERATED",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: budget_clients
   */
  budget_clients: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "company_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "client_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "project_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "project_category",
      type: "varchar(100)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "expected_amount",
      type: "decimal(12,2)",
      nullable: false,
    },
    {
      column: "received_amount",
      type: "decimal(12,2)",
      nullable: true,
      default: "0.00",
    },
    {
      column: "payment_status",
      type: "enum('pending','partial','received','overdue')",
      nullable: true,
      default: "'pending'",
      key: "MUL",
    },
    {
      column: "due_date",
      type: "date",
      nullable: true,
      default: "NULL",
    },
    {
      column: "notes",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "month",
      type: "varchar(7)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
    {
      column: "created_by",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
  ],

  /**
   * Table: budget_payment_history
   */
  budget_payment_history: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "client_id",
      type: "int(11)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "previous_amount",
      type: "decimal(12,2)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "new_amount",
      type: "decimal(12,2)",
      nullable: false,
    },
    {
      column: "amount_change",
      type: "decimal(12,2)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "previous_status",
      type: "varchar(20)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "new_status",
      type: "varchar(20)",
      nullable: false,
    },
    {
      column: "notes",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_by",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
  ],

  /**
   * Table: calendar_events
   */
  calendar_events: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "title",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "event_type",
      type: "varchar(100)",
      nullable: false,
      default: "'Meeting'",
      key: "MUL",
    },
    {
      column: "start_time",
      type: "time",
      nullable: true,
      default: "NULL",
    },
    {
      column: "end_time",
      type: "time",
      nullable: true,
      default: "NULL",
    },
    {
      column: "date",
      type: "date",
      nullable: false,
      key: "MUL",
    },
    {
      column: "end_date",
      type: "date",
      nullable: false,
    },
    {
      column: "agenda",
      type: "text",
      nullable: true,
      default: "''",
    },
    {
      column: "link",
      type: "varchar(500)",
      nullable: true,
      default: "''",
    },
    {
      column: "day",
      type: "enum('workingday','holiday')",
      nullable: true,
      default: "'workingday'",
    },
    {
      column: "form_type",
      type: "enum('day','week','month')",
      nullable: false,
      key: "MUL",
    },
    {
      column: "attendees",
      type: "longtext",
      nullable: false,
      default: "json_array()",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
    {
      column: "priority",
      type: "enum('High','Medium','Low')",
      nullable: false,
      default: "'Medium'",
    },
    {
      column: "subtype",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "mode",
      type: "enum('Online','Offline')",
      nullable: true,
      default: "NULL",
    },
    {
      column: "audience",
      type: "enum('Staff','Client')",
      nullable: true,
      default: "NULL",
    },
    {
      column: "event_status",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "remarks",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "technical_presentation",
      type: "longtext",
      nullable: true,
      default: "NULL",
    },
    {
      column: "actual_start_time",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "actual_end_time",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "actual_duration",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
  ],

  /**
   * Table: ClientsData
   */
  ClientsData: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "company_name",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "customer_name",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "industry_type",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "website",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "address",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "city",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "state",
      type: "varchar(200)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "reference",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "requirements",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
    {
      column: "active",
      type: "tinyint(1)",
      nullable: true,
      default: "1",
    },
    {
      column: "FollowupTaken",
      type: "tinyint(1)",
      nullable: true,
      default: "0",
    },
  ],

  /**
   * Table: clientsdataFollowup
   */
  clientsdataFollowup: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "client_id",
      type: "int(11)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "contact_person_id",
      type: "int(11)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "status",
      type: "enum('Followup Taken','Not picking/busy/others','Not Interested','In progress')",
      nullable: true,
      default: "NULL",
      key: "MUL",
    },
    {
      column: "next_followup_date",
      type: "varchar(255)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "remarks",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: ClientsDataManagement
   */
  ClientsDataManagement: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "company_name",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "customer_name",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "industry_type",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "website",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "contactPersons",
      type: "longtext",
      nullable: true,
      default: "NULL",
    },
    {
      column: "address",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "city",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "state",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "reference",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "requirements",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
    {
      column: "active",
      type: "tinyint(1)",
      nullable: true,
      default: "1",
    },
  ],

  /**
   * Table: company_budget
   */
  company_budget: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "date",
      type: "date",
      nullable: false,
      key: "MUL",
    },
    {
      column: "payment_method",
      type: "enum('Cash','Account','Gpay','Card')",
      nullable: false,
      default: "'Cash'",
      key: "MUL",
    },
    {
      column: "credited_amount",
      type: "decimal(10,2)",
      nullable: true,
      default: "0.00",
    },
    {
      column: "debited_amount",
      type: "decimal(10,2)",
      nullable: true,
      default: "0.00",
    },
    {
      column: "given_member",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
      key: "MUL",
    },
    {
      column: "received_member",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
      key: "MUL",
    },
    {
      column: "reason",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "updated_by",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: ContactPersons
   */
  ContactPersons: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "clientID",
      type: "int(11)",
      nullable: true,
      default: "NULL",
      key: "MUL",
    },
    {
      column: "name",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "contactNumber",
      type: "varchar(20)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "email",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "designation",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: dayReport
   */
  dayReport: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employeeID",
      type: "varchar(50)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "projectId",
      type: "int(11)",
      nullable: false,
    },
    {
      column: "taskId",
      type: "varchar(100)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "activityId",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
      key: "MUL",
    },
    {
      column: "createdAt",
      type: "datetime",
      nullable: true,
      default: "current_timestamp()",
      key: "MUL",
    },
    {
      column: "updatedAt",
      type: "datetime",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
    {
      column: "task_date",
      type: "date",
      nullable: true,
      default: "NULL",
      extra: "STORED GENERATED",
    },
  ],

  /**
   * Table: designations
   */
  designations: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "designation",
      type: "varchar(255)",
      nullable: false,
      key: "UNI",
    },
    {
      column: "created_date",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_date",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: employees_details
   */
  employees_details: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "intern_id",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "employee_name",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "dob",
      type: "date",
      nullable: true,
      default: "NULL",
    },
    {
      column: "gender",
      type: "enum('male','female','other')",
      nullable: true,
      default: "NULL",
    },
    {
      column: "email_personal",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "email_official",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "phone_personal",
      type: "varchar(30)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "phone_official",
      type: "varchar(30)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "phone_alternative",
      type: "varchar(30)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "phone_relation",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "blood_group",
      type: "varchar(10)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "account_name",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "account_number",
      type: "varchar(30)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "bank_name",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "ifsc_code",
      type: "varchar(20)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "employment_type",
      type: "enum('On Role','Intern')",
      nullable: true,
      default: "NULL",
    },
    {
      column: "designation",
      type: "varchar(60)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "team_head",
      type: "tinyint(1)",
      nullable: true,
      default: "0",
    },
    {
      column: "working_status",
      type: "varchar(20)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "join_date",
      type: "date",
      nullable: true,
      default: "NULL",
    },
    {
      column: "intern_start_date",
      type: "date",
      nullable: true,
      default: "NULL",
    },
    {
      column: "intern_end_date",
      type: "date",
      nullable: true,
      default: "NULL",
    },
    {
      column: "address",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "password",
      type: "varchar(255)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "profile_url",
      type: "varchar(250)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "resume_url",
      type: "varchar(250)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "offer_letter_url",
      type: "varchar(250)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "intern_offer_letter_url",
      type: "varchar(250)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "ID_url",
      type: "longtext",
      nullable: true,
      default: "NULL",
    },
    {
      column: "Certificates_url",
      type: "longtext",
      nullable: true,
      default: "NULL",
    },
    {
      column: "otherDocs_url",
      type: "longtext",
      nullable: true,
      default: "NULL",
    },
    {
      column: "exit_docs_url",
      type: "longtext",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
    {
      column: "emailPassword",
      type: "varchar(200)",
      nullable: true,
      default: "''",
    },
  ],

  /**
   * Table: employees_reports
   */
  employees_reports: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "employee_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "project_id",
      type: "int(11)",
      nullable: false,
    },
    {
      column: "project_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "start_date",
      type: "date",
      nullable: true,
      default: "NULL",
    },
    {
      column: "end_date",
      type: "date",
      nullable: true,
      default: "NULL",
    },
    {
      column: "daily_reports",
      type: "longtext",
      nullable: false,
      comment: "JSON array of daily reports",
    },
    {
      column: "latest_status",
      type: "enum('In Progress','Completed')",
      nullable: true,
      default: "'In Progress'",
      key: "MUL",
    },
    {
      column: "latest_progress",
      type: "int(11)",
      nullable: true,
      default: "0",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: employee_images
   */
  employee_images: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employee_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "image_url",
      type: "varchar(500)",
      nullable: false,
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
  ],

  /**
   * Table: Followups
   */
  Followups: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "clientID",
      type: "int(11)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: false,
    },
    {
      column: "contactPersonID",
      type: "int(11)",
      nullable: true,
      default: "NULL",
      key: "MUL",
    },
    {
      column: "status",
      type: "enum('followup','project_onboard','not_interested','dropped','lead','demo_shared','appointment','quotation','proposal','not_reachable','not_available','not_picking')",
      nullable: false,
    },
    {
      column: "remarks",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "nextFollowupDate",
      type: "varchar(255)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "shared",
      type: "varchar(10)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
    {
      column: "Following",
      type: "tinyint(4)",
      nullable: true,
      default: "0",
    },
  ],

  /**
   * Table: intern_dailyreport
   */
  intern_dailyreport: [
    {
      column: "id",
      type: "bigint(20)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "employee_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "report_date",
      type: "date",
      nullable: false,
      key: "MUL",
    },
    {
      column: "project_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "hours",
      type: "decimal(4,2)",
      nullable: false,
      default: "0.00",
    },
    {
      column: "work_done",
      type: "text",
      nullable: false,
    },
    {
      column: "section",
      type: "enum('Full Day','Morning','Afternoon')",
      nullable: false,
      default: "'Full Day'",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: interviews
   */
  interviews: [
    {
      column: "id",
      type: "bigint(20) unsigned",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "name",
      type: "varchar(150)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "phone_number",
      type: "varchar(20)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "city",
      type: "varchar(100)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "position",
      type: "varchar(150)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "schedule_date",
      type: "date",
      nullable: false,
      key: "MUL",
    },
    {
      column: "status",
      type: "enum('Pending','Attended','Re-schedule','Cancelled')",
      nullable: false,
      default: "'Pending'",
      key: "MUL",
    },
    {
      column: "remarks",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: leave_requests
   */
  leave_requests: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "leave_type",
      type: "varchar(100)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "from_date",
      type: "date",
      nullable: false,
      key: "MUL",
    },
    {
      column: "to_date",
      type: "date",
      nullable: true,
      default: "NULL",
    },
    {
      column: "number_of_days",
      type: "decimal(5,1)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "reason",
      type: "text",
      nullable: false,
    },
    {
      column: "status",
      type: "enum('pending','approved','rejected')",
      nullable: true,
      default: "'pending'",
      key: "MUL",
    },
    {
      column: "team_head_status",
      type: "enum('approved','rejected','hold')",
      nullable: true,
      default: "NULL",
    },
    {
      column: "team_head_remark",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "team_head_updated_by",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "team_head_updated_at",
      type: "timestamp",
      nullable: true,
      default: "NULL",
    },
    {
      column: "management_status",
      type: "enum('approved','rejected','hold')",
      nullable: true,
      default: "NULL",
    },
    {
      column: "management_remark",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "management_updated_by",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "management_updated_at",
      type: "timestamp",
      nullable: true,
      default: "NULL",
    },
    {
      column: "approved_by",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      key: "MUL",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
    {
      column: "duration_type",
      type: "varchar(20)",
      nullable: true,
      default: "NULL",
    },
  ],

  /**
   * Table: maid_attendance
   */
  maid_attendance: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "attendance_date",
      type: "date",
      nullable: false,
      key: "UNI",
    },
    {
      column: "morning_in",
      type: "time",
      nullable: true,
      default: "NULL",
    },
    {
      column: "morning_out",
      type: "time",
      nullable: true,
      default: "NULL",
    },
    {
      column: "evening_in",
      type: "time",
      nullable: true,
      default: "NULL",
    },
    {
      column: "evening_out",
      type: "time",
      nullable: true,
      default: "NULL",
    },
    {
      column: "is_leave",
      type: "tinyint(1)",
      nullable: true,
      default: "0",
      key: "MUL",
    },
    {
      column: "leave_type",
      type: "enum('maid','office')",
      nullable: true,
      default: "NULL",
      key: "MUL",
    },
    {
      column: "leave_duration",
      type: "enum('full','morning','evening')",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: maid_tasks
   */
  maid_tasks: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "week_key",
      type: "date",
      nullable: false,
      key: "MUL",
      comment: "Monday of the week (YYYY-MM-DD)",
    },
    {
      column: "task_id",
      type: "varchar(50)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "check_index",
      type: "int(11)",
      nullable: false,
      comment: "Which completion (0, 1, 2...)",
    },
    {
      column: "completed_date",
      type: "date",
      nullable: false,
      key: "MUL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
  ],

  /**
   * Table: maid_task_config
   */
  maid_task_config: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "task_id",
      type: "varchar(50)",
      nullable: false,
      key: "UNI",
    },
    {
      column: "task_name",
      type: "varchar(100)",
      nullable: false,
    },
    {
      column: "required_times",
      type: "int(11)",
      nullable: false,
      default: "1",
    },
    {
      column: "image_url",
      type: "varchar(500)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "is_active",
      type: "tinyint(1)",
      nullable: true,
      default: "1",
    },
    {
      column: "display_order",
      type: "int(11)",
      nullable: true,
      default: "0",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: ManagementFollowups
   */
  ManagementFollowups: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "clientID",
      type: "int(11)",
      nullable: true,
      default: "NULL",
      key: "MUL",
    },
    {
      column: "projectId",
      type: "int(11)",
      nullable: true,
      default: "NULL",
      key: "MUL",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "contactPersonID",
      type: "int(11)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "status",
      type: "enum('Followup Taken','Not picking/busy/others','Lead','Quotation','Proposal','ProjectOnboard','Droped')",
      nullable: true,
      default: "NULL",
      key: "MUL",
    },
    {
      column: "nextFollowupDate",
      type: "date",
      nullable: true,
      default: "NULL",
    },
    {
      column: "remarks",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "quotation_path",
      type: "longtext",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: ManagementMeetings
   */
  ManagementMeetings: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "followupID",
      type: "int(11)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "title",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "date",
      type: "date",
      nullable: false,
    },
    {
      column: "time",
      type: "time",
      nullable: true,
      default: "NULL",
    },
    {
      column: "type",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "agenda",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "link",
      type: "varchar(500)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "location",
      type: "varchar(255)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "status",
      type: "enum('inprogress','completed','cancelled')",
      nullable: false,
      default: "'inprogress'",
      key: "MUL",
    },
    {
      column: "attendees_client",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "attendees_our_side",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "outcomes",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "mom_recorded_at",
      type: "datetime",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: ManagementOnboardedProjects
   */
  ManagementOnboardedProjects: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "client_id",
      type: "int(11)",
      nullable: false,
    },
    {
      column: "company_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "customer_name",
      type: "varchar(255)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "project_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "category",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "start_date",
      type: "date",
      nullable: false,
    },
    {
      column: "end_date",
      type: "date",
      nullable: false,
    },
    {
      column: "review_date",
      type: "date",
      nullable: true,
      default: "NULL",
    },
    {
      column: "remarks",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "budget_status",
      type: "varchar(50)",
      nullable: false,
      default: "'pending'",
    },
    {
      column: "onboarded_by",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: Marketing_meetings
   */
  Marketing_meetings: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "clientID",
      type: "int(11)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "followupID",
      type: "int(11)",
      nullable: true,
      default: "NULL",
      key: "MUL",
    },
    {
      column: "title",
      type: "varchar(255)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "date",
      type: "varchar(255)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "startTime",
      type: "varchar(255)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "endTime",
      type: "varchar(255)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "agenda",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "link",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "attendees",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: marketing_resources
   */
  marketing_resources: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "resource_category",
      type: "enum('SEO','SMM','CM','Others')",
      nullable: true,
      default: "'Others'",
    },
    {
      column: "link_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "link_description",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "link",
      type: "varchar(500)",
      nullable: false,
    },
    {
      column: "category",
      type: "enum('important','rough')",
      nullable: false,
      default: "'important'",
      key: "MUL",
    },
    {
      column: "employee_id",
      type: "varchar(100)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "last_updated_by",
      type: "varchar(100)",
      nullable: false,
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      key: "MUL",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: marketing_tasks
   */
  marketing_tasks: [
    {
      column: "task_id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "task_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "category_id",
      type: "int(11)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "task_type",
      type: "enum('Daily','Weekly','Monthly')",
      nullable: false,
      default: "'Daily'",
      key: "MUL",
    },
    {
      column: "description",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
    {
      column: "to_assign",
      type: "varchar(200)",
      nullable: true,
      default: "NULL",
    },
  ],

  /**
   * Table: marketing_task_assignments
   */
  marketing_task_assignments: [
    {
      column: "assignment_id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "task_id",
      type: "int(11)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "assigned_date",
      type: "date",
      nullable: false,
      key: "MUL",
    },
    {
      column: "status",
      type: "enum('Assigned','Completed')",
      nullable: true,
      default: "NULL",
      key: "MUL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
    {
      column: "remarks",
      type: "text",
      nullable: true,
      default: "NULL",
    },
  ],

  /**
   * Table: marketing_task_categories
   */
  marketing_task_categories: [
    {
      column: "category_id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "category_name",
      type: "varchar(100)",
      nullable: false,
      key: "UNI",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: meeting_requests
   */
  meeting_requests: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: false,
    },
    {
      column: "meeting_title",
      type: "varchar(50)",
      nullable: false,
    },
    {
      column: "meeting_date",
      type: "date",
      nullable: false,
    },
    {
      column: "from_time",
      type: "time",
      nullable: false,
    },
    {
      column: "to_time",
      type: "time",
      nullable: false,
    },
    {
      column: "duration_minutes",
      type: "int(11)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "attendees",
      type: "longtext",
      nullable: false,
    },
    {
      column: "description",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "status",
      type: "enum('scheduled','completed','cancelled')",
      nullable: true,
      default: "'scheduled'",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: missed_attendance_requests
   */
  missed_attendance_requests: [
    {
      column: "id",
      type: "bigint(20)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: false,
    },
    {
      column: "employee_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "request_date",
      type: "date",
      nullable: false,
    },
    {
      column: "request_time",
      type: "time",
      nullable: false,
    },
    {
      column: "attendance_type",
      type: "enum('Morning','Afternoon')",
      nullable: false,
    },
    {
      column: "action",
      type: "enum('In','Out')",
      nullable: false,
    },
    {
      column: "reason",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "status",
      type: "enum('pending','approved','rejected')",
      nullable: true,
      default: "'pending'",
    },
    {
      column: "reviewed_by",
      type: "varchar(255)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "reviewed_at",
      type: "timestamp",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: monthly_budgets
   */
  monthly_budgets: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "month",
      type: "varchar(7)",
      nullable: false,
      key: "UNI",
    },
    {
      column: "budget_amount",
      type: "decimal(12,2)",
      nullable: false,
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
    {
      column: "created_by",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
  ],

  /**
   * Table: occasion_images
   */
  occasion_images: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "occasion_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "image_url",
      type: "varchar(500)",
      nullable: false,
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
  ],

  /**
   * Table: permission_requests
   */
  permission_requests: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "permission_date",
      type: "date",
      nullable: false,
      key: "MUL",
    },
    {
      column: "from_time",
      type: "time",
      nullable: false,
    },
    {
      column: "to_time",
      type: "time",
      nullable: false,
    },
    {
      column: "duration_minutes",
      type: "decimal(5,2)",
      nullable: false,
    },
    {
      column: "reason",
      type: "text",
      nullable: false,
    },
    {
      column: "status",
      type: "enum('pending','approved','rejected')",
      nullable: true,
      default: "'pending'",
      key: "MUL",
    },
    {
      column: "approved_by",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      key: "MUL",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: projects
   */
  projects: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "client_id",
      type: "int(11)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "project_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "project_category",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "budget_status",
      type: "varchar(50)",
      nullable: true,
      default: "'pending'",
      key: "MUL",
    },
    {
      column: "onboard_status",
      type: "enum('In progress','onboarded','cancelled')",
      nullable: true,
      default: "'In progress'",
    },
    {
      column: "start_date",
      type: "date",
      nullable: true,
      default: "NULL",
    },
    {
      column: "end_date",
      type: "date",
      nullable: true,
      default: "NULL",
    },
    {
      column: "review_date",
      type: "date",
      nullable: true,
      default: "NULL",
    },
    {
      column: "remarks",
      type: "text",
      nullable: true,
      default: "NULL",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
      key: "MUL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: project_budgets
   */
  project_budgets: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "project_id",
      type: "int(11)",
      nullable: false,
      key: "UNI",
    },
    {
      column: "total_budget",
      type: "decimal(15,2)",
      nullable: false,
    },
    {
      column: "starting_date",
      type: "date",
      nullable: false,
    },
    {
      column: "completion_date",
      type: "date",
      nullable: false,
    },
    {
      column: "payments",
      type: "longtext",
      nullable: true,
      default: "NULL",
    },
    {
      column: "documents",
      type: "longtext",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: push_subscriptions
   */
  push_subscriptions: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
      key: "UNI",
    },
    {
      column: "subscription",
      type: "longtext",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
  ],

  /**
   * Table: quotes
   */
  quotes: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "date",
      type: "date",
      nullable: false,
      key: "MUL",
    },
    {
      column: "quote",
      type: "text",
      nullable: false,
    },
    {
      column: "occasion",
      type: "varchar(100)",
      nullable: true,
      default: "NULL",
      key: "MUL",
    },
    {
      column: "image_url",
      type: "varchar(500)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
    {
      column: "title",
      type: "varchar(255)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "end_date",
      type: "date",
      nullable: true,
      default: "NULL",
    },
  ],

  /**
   * Table: role_tab_access
   */
  role_tab_access: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "designation",
      type: "varchar(100)",
      nullable: false,
    },
    {
      column: "group_key",
      type: "varchar(50)",
      nullable: false,
    },
    {
      column: "tab_label",
      type: "varchar(100)",
      nullable: false,
    },
    {
      column: "path",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "is_allowed",
      type: "tinyint(1)",
      nullable: true,
      default: "1",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
    {
      column: "sort_order",
      type: "int(11)",
      nullable: true,
      default: "0",
    },
    {
      column: "employee_id",
      type: "varchar(100)",
      nullable: true,
      default: "''",
    },
  ],

  /**
   * Table: salary_calculation
   */
  salary_calculation: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employee_id",
      type: "varchar(20)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "month",
      type: "tinyint(4)",
      nullable: false,
      key: "MUL",
      comment: "1-12 representing January to December",
    },
    {
      column: "year",
      type: "year(4)",
      nullable: false,
    },
    {
      column: "basic_salary",
      type: "decimal(10,2)",
      nullable: false,
      default: "0.00",
    },
    {
      column: "total_leave_days",
      type: "decimal(5,1)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "paid_leave_days",
      type: "decimal(5,1)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "deduction_amount",
      type: "decimal(10,2)",
      nullable: true,
      default: "0.00",
    },
    {
      column: "total_deduction_days",
      type: "int(11)",
      nullable: true,
      default: "0",
    },
    {
      column: "incentive",
      type: "decimal(10,2)",
      nullable: true,
      default: "0.00",
    },
    {
      column: "bonus",
      type: "decimal(10,2)",
      nullable: true,
      default: "0.00",
    },
    {
      column: "medical",
      type: "decimal(10,2)",
      nullable: true,
      default: "0.00",
    },
    {
      column: "other_allowance",
      type: "decimal(10,2)",
      nullable: true,
      default: "0.00",
    },
    {
      column: "total_salary",
      type: "decimal(10,2)",
      nullable: false,
      default: "0.00",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: false,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: false,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
    {
      column: "created_by",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "updated_by",
      type: "varchar(50)",
      nullable: true,
      default: "NULL",
    },
  ],

  /**
   * Table: sticky_notes
   */
  sticky_notes: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "note_id",
      type: "bigint(20)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "content",
      type: "longtext",
      nullable: true,
      default: "NULL",
    },
    {
      column: "background_color",
      type: "varchar(20)",
      nullable: true,
      default: "'#fef68a'",
    },
    {
      column: "is_pinned",
      type: "tinyint(1)",
      nullable: true,
      default: "0",
    },
    {
      column: "is_minimized",
      type: "tinyint(1)",
      nullable: true,
      default: "0",
    },
    {
      column: "position_x",
      type: "int(11)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "position_y",
      type: "int(11)",
      nullable: true,
      default: "NULL",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

  /**
   * Table: user_notifications
   */
  user_notifications: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "notification_id",
      type: "varchar(255)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "notification_data",
      type: "longtext",
      nullable: false,
    },
    {
      column: "is_read",
      type: "tinyint(1)",
      nullable: false,
      default: "0",
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: false,
      default: "current_timestamp()",
    },
  ],

  /**
   * Table: workdone_reports
   */
  workdone_reports: [
    {
      column: "id",
      type: "int(11)",
      nullable: false,
      key: "PRI",
      extra: "auto_increment",
    },
    {
      column: "employee_id",
      type: "varchar(50)",
      nullable: false,
      key: "MUL",
    },
    {
      column: "employee_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "project_name",
      type: "varchar(255)",
      nullable: false,
    },
    {
      column: "description",
      type: "text",
      nullable: false,
    },
    {
      column: "created_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      key: "MUL",
    },
    {
      column: "updated_at",
      type: "timestamp",
      nullable: true,
      default: "current_timestamp()",
      extra: "on update current_timestamp()",
    },
  ],

};

module.exports = databaseSchema;
