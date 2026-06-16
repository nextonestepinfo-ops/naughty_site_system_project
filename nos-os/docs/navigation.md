# Nos OS Screen Transition Diagram

```mermaid
flowchart TD
  Login["/login"] --> Dashboard["/ Dashboard"]
  Dashboard --> Projects["/projects"]
  Dashboard --> Tasks["/tasks"]
  Dashboard --> Employees["/employees"]
  Dashboard --> Attendance["/attendance"]
  Dashboard --> Assistant["/assistant"]
  Dashboard --> Notifications["/notifications"]
  Projects --> ProjectDetail["/projects/:id"]
  ProjectDetail --> Tasks
  ProjectDetail --> Customers["/customers"]
  Tasks --> ProjectDetail
  Employees --> EmployeeProfile["/employees/:id"]
  EmployeeProfile --> Tasks
  EmployeeProfile --> Attendance
  Attendance --> Notifications
  Assistant --> Tasks
  Settings["/settings"] --> Login
  Dashboard --> Settings
```

## Navigation Principles

- Every primary workflow is reachable within two taps from the mobile bottom nav.
- Detail pages always keep a clear return path to the related list.
- Admin-only sections appear disabled or summarized for general employees.
- AI recommendations deep-link into tasks or project detail pages when backed
  by a target record.

