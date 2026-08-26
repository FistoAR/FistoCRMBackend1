# Workspace Style Guidelines

## General Standards
- Use `DD/MM/YYYY` as the default date format.
- Use Indian Standard Time (IST) for all timestamps in the UI.
- Store all dates in UTC in the database and convert to IST in the frontend.
- Use 24-hour time format (`HH:mm:ss`).
- Use UTF-8 encoding everywhere.

## Backend Standards
- **Performance**:
  - Prefer O(1) lookups whenever possible using Maps, HashMaps, or indexed database queries.
  - Avoid unnecessary nested loops (O(n²)).
  - Keep API response time below 300ms for normal requests.
  - Add proper database indexes.
  - Use pagination for large datasets.
  - Never fetch unnecessary columns.

## API Standards
- Follow RESTful APIs.
- Use proper HTTP status codes:
  - `200 OK`
  - `201 Created`
  - `400 Bad Request`
  - `401 Unauthorized`
  - `403 Forbidden`
  - `404 Not Found`
  - `409 Conflict`
  - `500 Internal Server Error`
- **Response Format**:
  - Success:
    ```json
    {
      "success": true,
      "message": "Data fetched successfully",
      "data": {}
    }
    ```
  - Error:
    ```json
    {
      "success": false,
      "message": "Invalid credentials"
    }
    ```
- **Validation**:
  - Validate every request.
  - Never trust frontend data.
  - Sanitize all inputs.
  - Prevent SQL Injection / NoSQL Injection.
  - Escape HTML where required.

## Logging
- Log errors only.
- Never expose stack traces to users.
- Maintain request logs.
- Store audit logs for important operations.

## Frontend Standards
- Use React functional components.
- Use Hooks only.
- Avoid prop drilling; use Context API or Redux when needed.
- Lazy-load heavy components.
- Optimize images.
- Show loading indicators for API requests.
- Display meaningful error messages.

## Code Quality
- Follow ESLint and Prettier rules.
- Avoid duplicate code (DRY).
- Keep functions small and focused (single responsibility).
- Use meaningful variable names.
- Add comments only for complex logic.
- Remove unused imports, variables, and code.


# UI & UX Guidelines

## General
- Design should be modern, clean, and professional.
- Prioritize usability over visual complexity.
- Maintain a consistent design language across the application.
- Avoid unnecessary animations or decorative elements.
- Every screen should have a clear visual hierarchy.

## Layout
- Use a responsive design for Mobile, Tablet, Laptop, and Desktop.
- Keep consistent spacing throughout the application (8px grid system).
- Align elements properly; avoid uneven margins and padding.
- Do not create horizontal scrolling unless absolutely necessary.
- Keep important actions visible without excessive scrolling.

## Typography
- Use a maximum of 2 font families.
- Maintain consistent font sizes.
- Use bold only for headings or important information.
- Ensure text has sufficient contrast for readability.

## Colors
- Use a limited color palette.
- Primary color should be used for main actions.
- Secondary colors should support, not dominate.
- Error = Red
- Success = Green
- Warning = Orange
- Information = Blue

## Components
- Reuse components whenever possible.
- Buttons should have consistent height, border radius, and padding.
- Inputs should have labels, placeholders, and validation messages.
- Cards should have subtle shadows and rounded corners.
- Tables should support sorting, searching, and pagination.
- Modals should be responsive and closable.

## Forms
- Validate input immediately where appropriate.
- Clearly indicate required fields.
- Display user-friendly error messages.
- Preserve entered data if validation fails.
- Group related fields together.

## Navigation
- Navigation should always indicate the active page.
- Breadcrumbs for nested pages.
- Keep menu depth minimal.
- Important actions should be accessible within 2-3 clicks.

## Data Display
- Use skeleton loading (pulsing skeleton placeholders) for tables and components instead of blank screens, top bar loaders, or spinners.
- Display empty states with helpful messages.
- Use pagination or lazy loading for large datasets.
- Format dates as dd/MM/yyyy.
- Display time in IST.
- Format currency consistently.

## Feedback
- Confirm destructive actions.
- Show success/error toast notifications.
- Disable buttons while submitting.
- Display progress indicators for long-running tasks.

## Accessibility
- Ensure keyboard navigation works.
- Maintain sufficient color contrast.
- Use semantic HTML.
- Add descriptive labels to form controls.
- Avoid relying solely on color to convey information.

## Performance
- Lazy load large components.
- Optimize images.
- Minimize unnecessary re-renders.
- Avoid heavy animations.
- Maintain smooth interactions.

## Mobile Experience
- Touch targets should be at least 44x44px.
- Avoid hover-only interactions.
- Collapse large tables appropriately.
- Keep navigation thumb-friendly.

## Dashboard Design
- Show the most important metrics first.
- Group related information.
- Avoid information overload.
- Use charts only when they add value.
- Keep dashboards scannable.

## AI Instructions
Whenever generating UI:
- Follow these UI/UX guidelines.
- Build reusable components.
- Maintain responsive layouts.
- Prioritize accessibility.
- Keep the interface clean and professional.
- Never sacrifice usability for aesthetics.

## CRM-Specific UX

- Every list page should include:
  - Search
  - Filters
  - Sorting
  - Pagination
  - Export (CSV/Excel) if applicable

- Every form should support:
  - Create
  - Edit
  - View
  - Delete (with confirmation)

- Show skeleton loading states for all API requests (use pulsing skeleton placeholders instead of bar loaders or spinning wheels).

- Date Range Filters alignment:
  - The "To Date" field must be disabled until a valid "From Date" is selected.
  - The `min` attribute of the "To Date" input must automatically be set to the selected "From Date".

- Handle API failures gracefully.

- Never block the UI unnecessarily.

- Display timestamps in dd/MM/yyyy HH:mm IST.

- Tables should remain usable with 10,000+ records.

- Prefer dialogs for quick edits instead of full page navigation.

- Keep actions predictable and consistent across all modules.

- Truncate long text fields (e.g., remarks, company, customer) in table cells and display a custom hover tooltip with a 1-click copy option.