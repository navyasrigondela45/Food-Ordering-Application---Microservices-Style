# AWS ECS Service Connect — Complete Documentation

## 1. Overview

AWS ECS Service Connect provides service-to-service communication and service discovery between ECS services.

Instead of applications communicating using changing ECS task IP addresses, services communicate using stable service names and ports.

Example:

```text
http://user-service:3001
http://product-service:3002
postgres:5432
```

Service Connect provides the service discovery and managed communication layer between ECS services.

---

# 2. Project Architecture

Our Food Ordering application contains:

```text
                         ECS Cluster
                  Food-application-cluster
                            |
             +--------------+--------------+
             |              |              |
             ▼              ▼              ▼
       User Service   Product Service   Order Service
          :3001           :3002            :3003
          SERVER           SERVER           CLIENT
             |               |               |
             +---------------+---------------+
                             |
                       Service Connect
                             |
                           my-ns
                             |
                       Cloud Map Namespace
```

PostgreSQL:

```text
                    PostgreSQL
                       :5432
                         |
                    ECS Service
                         |
                  Service Connect
                         |
                       my-ns
```

Complete communication model:

```text
                         my-ns
                           |
                   Service Connect
                           |
          +----------------+----------------+
          |                |                |
          ▼                ▼                ▼
     User Service    Product Service   Order Service
        :3001            :3002             :3003
        SERVER            SERVER            CLIENT
          ▲                 ▲                |
          |                 |                |
          +-------- Order ---+----------------+
                           |
                           ▼
                     PostgreSQL
                        :5432
```

---

# 3. Services and Their Roles

## User Service

```text
Port: 3001
Role: Service Connect Server
```
Responsible for:

- User registration
- User authentication
- User information
- JWT-based authentication

It exposes APIs that can be consumed by other services.

```text
User Service = SERVER / PROVIDER
```

---

## Product Service

```text
Port: 3002
Role: Service Connect Server
```

Responsible for:

- Product information
- Product lookup
- Product details

Example API:

```text
GET /api/products/:id
```

```text
Product Service = SERVER / PROVIDER
```

---

## Order Service

```text
Port: 3003
Role: Service Connect Client
```

Responsible for:

- Creating orders
- Processing orders
- Communicating with User Service
- Communicating with Product Service

Environment variables:

```text
USER_SERVICE_URL=http://user-service:3001
PRODUCT_SERVICE_URL=http://product-service:3002
```

```text
Order Service = CLIENT / CONSUMER
```

If another microservice needs to call Order through Service Connect, Order can be configured as:

```text
SERVER + CLIENT
```

---

## PostgreSQL

```text
Port: 5432
Role: Database
```

Database:

```text
foodordering
```

Credentials used during the project:

```text
User: admin
Password: admin123
```

PostgreSQL was deployed as a separate ECS service/task.

---

# 4. Why Service Connect?

Without Service Connect, an application may need to communicate with a specific ECS task IP.

Example:

```text
Order
  |
  ▼
172.31.10.20:3001
```

The problem is that ECS task IP addresses can change.

Example:

```text
Old User Task
172.31.10.20
     |
     ▼
Task replaced
     |
     ▼
New User Task
172.31.45.90
```

The application should not need to be modified whenever a task is replaced.

With Service Connect:

```text
Order
  |
  ▼
user-service:3001
  |
  ▼
Service Connect
  |
  ▼
Current User Task
```

The application uses the stable service name rather than the changing task IP.

---

# 5. Main Purpose of Service Connect

Service Connect provides:

```text
Service Discovery
        +
Stable Service Names
        +
Service-to-Service Communication
        +
Managed Proxy
```

Applications can use:

```text
user-service:3001
product-service:3002
postgres:5432
```

instead of hardcoded task IP addresses.

---

# 6. Service Connect Namespace

Our namespace:

```text
my-ns
```

Cloud Map namespace:

```text
arn:aws:servicediscovery:eu-north-1:161020170241:namespace/ns-cvbd3nofqv47qqby
```

The namespace groups services that need to communicate through Service Connect.

Conceptually:

```text
my-ns
 |
 +-- user-service
 |
 +-- product-service
 |
 +-- order-service
 |
 +-- postgres
```

The namespace provides the logical service-discovery environment.

---

# 7. AWS Cloud Map

AWS Cloud Map provides the service-discovery infrastructure used by Service Connect.

Conceptually:

```text
ECS Service
     |
     ▼
Service Connect
     |
     ▼
Cloud Map Namespace
     |
     ▼
Service Discovery
```

Our namespace:

```text
my-ns
```

ECS/Service Connect manages the service registration and discovery rather than the application manually maintaining task IP addresses.

---

# 8. Service Connect Proxy

When Service Connect is enabled, ECS runs a managed Service Connect proxy alongside the application container.

Example:

```text
Order Task
+--------------------------------------+
|                                      |
| Main Container                       |
| Order Application :3003              |
|                                      |
| ecs-service-connect-xxxx             |
| Service Connect Proxy                |
|                                      |
+--------------------------------------+
```

User:

```text
User Task
+--------------------------------------+
| User Application :3001              |
| Service Connect Proxy                |
+--------------------------------------+
```

Product:

```text
Product Task
+--------------------------------------+
| Product Application :3002           |
| Service Connect Proxy                |
+--------------------------------------+
```

The proxy participates in Service Connect communication.

---

# 9. Service Connect Server

A Service Connect server provides an endpoint that other services can consume.

Example:

```text
User Service :3001
```

Other services can call:

```text
user-service:3001
```

Similarly:

```text
Product Service :3002
```

Other services can call:

```text
product-service:3002
```

Therefore:

```text
User     = Server
Product  = Server
```

---

# 10. Service Connect Client

A Service Connect client consumes endpoints provided by other services.

Our Order Service consumes:

```text
User Service
Product Service
```

Therefore:

```text
Order = Client
```

Communication:

```text
Order
 |
 +------> user-service:3001
 |
 +------> product-service:3002
```

---

# 11. Client Only vs Client and Server

## Client Only

A service configured as Client only:

```text
Can consume other Service Connect services
```

but does not advertise its own Service Connect server endpoint.

Our Order Service is:

```text
Client only
```

because nothing in this architecture needs to call Order through Service Connect.

---

## Client and Server

A service configured as Client and Server:

```text
Can provide its own Service Connect endpoint
+
Can consume other Service Connect services
```

Example:

```text
Notification Service
        |
        ▼
Order Service
        |
        +------> User Service
        |
        +------> Product Service
```

Here:

```text
Order = Server + Client
```

---

# 12. Port Mapping

Port mapping is one of the most important parts of ECS Service Connect.

The application listens on a port inside the container.

For example:

```text
User Application
       |
       ▼
Port 3001
```

The ECS task definition contains a port mapping:

```text
Container Port: 3001
Protocol: TCP
```

Similarly:

```text
Product:
Container Port: 3002
Protocol: TCP
```

```text
Order:
Container Port: 3003
Protocol: TCP
```

```text
PostgreSQL:
Container Port: 5432
Protocol: TCP
```

---

# 13. Port Mapping Flow

The relationship is:

```text
Application
     |
     | listens on
     ▼
Container Port
     |
     ▼
ECS Port Mapping
     |
     ▼
Service Connect Endpoint
     |
     ▼
Service Discovery
     |
     ▼
Stable Service Name
```

Example:

```text
User Node.js Application
        |
        ▼
Container Port 3001
        |
        ▼
ECS Port Mapping
        |
        ▼
Service Connect
        |
        ▼
user-service:3001
```

---

# 14. What Is a Port Mapping Name?

A port mapping can have a name such as:

```text
user-80-tcp
```

or:

```text
main-5432-tcp
```

This is only the **port mapping name**.

It does NOT mean that the application is running on port 80.

For example:

```text
Port Mapping Name : user-80-tcp
Container Port    : 3001
Protocol          : TCP
```

The actual application port is:

```text
3001
```

Similarly:

```text
Port Mapping Name : main-5432-tcp
Container Port    : 5432
Protocol          : TCP
```

The actual PostgreSQL port is:

```text
5432
```

The port mapping name is an identifier used by ECS to reference that port mapping.

---

# 15. Port Mapping vs Service Connect Port

These are related but different concepts.

Example:

```text
Node.js Application
        |
        | listens
        ▼
Container Port 3001
        |
        ▼
ECS Port Mapping
        |
        ▼
Service Connect Endpoint
        |
        ▼
user-service:3001
```

The application listens on:

```text
3001
```

ECS knows about the port through the port mapping.

Service Connect uses that application endpoint for service discovery and communication.

---

# 16. Why Server Services Need Port Mapping

A server needs something to expose.

For example:

```text
User Service
     |
     ▼
Application listening on 3001
     |
     ▼
ECS Port Mapping
     |
     ▼
Service Connect Server Endpoint
     |
     ▼
user-service:3001
```

Without identifying the correct application port, Service Connect cannot correctly associate the service with the container's listening port.

Therefore, when configuring a Service Connect server, the correct container port mapping is important.

---

# 17. PostgreSQL Port Mapping

PostgreSQL listens on:

```text
5432
```

Therefore the ECS task definition should have:

```text
Container Port: 5432
Protocol: TCP
```

Example:

```text
PostgreSQL Container
        |
        ▼
5432/TCP
        |
        ▼
Port Mapping
main-5432-tcp
        |
        ▼
Service Connect
        |
        ▼
postgres:5432
```

The application can then use:

```text
DB_HOST=postgres
DB_PORT=5432
```

---

# 18. Service Connect Application Protocol

The ECS console provides application protocol options such as:

```text
HTTP
HTTP/2
gRPC
None
```

For PostgreSQL, the application protocol should not be treated as HTTP or gRPC.

PostgreSQL is not an HTTP or gRPC application.

Therefore, for a PostgreSQL TCP endpoint, the relevant configuration used in this project was:

```text
Protocol:
TCP

App Protocol:
None
```

This means:

```text
Transport protocol = TCP
Application protocol = None
```

For an HTTP-based microservice, an appropriate configuration can be:

```text
Protocol:
TCP

App Protocol:
HTTP
```

The application protocol describes the application-layer protocol, while TCP is the underlying transport protocol.

---

# 19. Service Connect Configuration Example

For a User Service:

```text
Container Port:
3001

Protocol:
TCP

Port Mapping:
user-80-tcp

Service Connect:
Enabled

Role:
Server

Discovery Name:
user-service

Port:
3001
```

For Product:

```text
Container Port:
3002

Protocol:
TCP

Service Connect:
Enabled

Role:
Server

Discovery Name:
product-service

Port:
3002
```

For Order:

```text
Container Port:
3003

Protocol:
TCP

Service Connect:
Enabled

Role:
Client

```

For PostgreSQL:

```text
Container Port:
5432

Protocol:
TCP

App Protocol:
None

Service Connect:
Enabled

Discovery Name:
postgres

Port:
5432
```

---

# 20. Service Connect Request Flow

Example: Order calls User.

```text
Order Application
       |
       | http://user-service:3001
       ▼
Order Service Connect Proxy
       |
       ▼
Service Discovery
       |
       ▼
User Service Connect Proxy
       |
       ▼
User Container
       |
       ▼
User Application :3001
```

Example: Order calls Product.

```text
Order Application
       |
       | http://product-service:3002
       ▼
Service Connect
       |
       ▼
Product Service
       |
       ▼
Product Application :3002
```

Example: Application connects to PostgreSQL.

```text
Application
     |
     | postgres:5432
     ▼
Service Connect
     |
     ▼
PostgreSQL Task
     |
     ▼
PostgreSQL :5432
```

---

# 21. Service Connect vs ALB

Service Connect and an Application Load Balancer solve different problems.

## ALB

Used primarily for incoming application traffic.

```text
Internet / Client
       |
       ▼
ALB
       |
       ▼
ECS Service
```

## Service Connect

Used primarily for internal service-to-service communication.

```text
Order Service
       |
       ▼
Service Connect
       |
       ▼
User / Product Service
```

Therefore:

```text
External Traffic
      ↓
     ALB

Internal Microservice Traffic
      ↓
Service Connect
```

---

# 22. Service Connect vs Security Groups

Security Groups control whether network traffic is allowed.

Service Connect provides service discovery and managed service communication.

They are not replacements for each other.

Conceptually:

```text
Service Connect
    ↓
Find and route to service

Security Group
    ↓
Allow / deny network traffic
```

Both must be correctly configured.

---

# 23. Service Connect vs Cloud Map

Cloud Map provides service discovery infrastructure.

Service Connect provides the ECS-integrated service-to-service communication mechanism.

Conceptually:

```text
Cloud Map
    ↓
Service Discovery Namespace

Service Connect
    ↓
ECS Service Communication
    +
Service Discovery Integration
```

In this project:

```text
Namespace = my-ns
```

---

# 24. Environment Variables

Order Service uses:

```text
USER_SERVICE_URL=http://user-service:3001
PRODUCT_SERVICE_URL=http://product-service:3002
```

The important point is that these use the Service Connect service names instead of ECS task IP addresses.

The application does not use:

```text
172.31.x.x
```

for internal service communication.

It uses:

```text
user-service
product-service
```

---

# 25. Environment Variable and API Path

Service Connect is responsible for reaching the service.

The application itself is responsible for constructing the correct API path.

Example:

```text
PRODUCT_SERVICE_URL=http://product-service:3002
```

Application code may construct:

```text
${PRODUCT_SERVICE_URL}/api/products/${productId}
```

Final request:

```text
http://product-service:3002/api/products/<product-id>
```

Therefore:

```text
Service Connect
        ↓
Gets request to Product Service

Application
        ↓
Determines the correct API endpoint
```

If the service is reachable but returns:

```text
404
```

then Service Connect/networking may already be working.

The next thing to check is the application/API route.

---

# 26. ECS Exec

ECS Exec was enabled to troubleshoot running containers.

Initially:

```text
ECS Exec: OFF
```

After enabling Execute Command on the ECS service and deploying a new task:

```text
ECS Exec: ON
```

Important:

Changing the service configuration does not necessarily change the state of an already-running task.

A new task deployment was required.

The workflow was:

```text
Enable ECS Exec
        |
        ▼
Update ECS Service
        |
        ▼
Replace old task
        |
        ▼
New task starts
        |
        ▼
ECS Exec enabled
```

---

# 27. Connecting Through ECS Exec

Once ECS Exec was enabled:

```text
Starting session with SessionId:
ecs-execute-command-xxxx
```

The container shell was available:

```text
/myapp #
```

This allowed direct troubleshooting from inside the application container.

---

# 28. Service Connect Troubleshooting

The major infrastructure issue in the project involved Service Connect communication.

The troubleshooting flow was:

```text
Application cannot connect to PostgreSQL
              |
              ▼
Check PostgreSQL ECS task
              |
              ▼
Check CloudWatch logs
              |
              ▼
PostgreSQL:
database system is ready to accept connections
              |
              ▼
Check ECS Exec
              |
              ▼
Enter application container
              |
              ▼
Check DNS
              |
              ▼
getent hosts postgres
              |
              ▼
Hostname resolves
              |
              ▼
Check TCP
              |
              ▼
nc -vz postgres 5432
              |
              ▼
TCP port appears open
              |
              ▼
Perform real PostgreSQL connection
              |
              ▼
Connection terminated unexpectedly
              |
              ▼
Test PostgreSQL task IP directly
              |
              ▼
DIRECT DB CONNECTED
              |
              ▼
Service Connect path suspected
              |
              ▼
Review Service Connect configuration
              |
              ▼
Review port mapping
              |
              ▼
Review client/server configuration
              |
              ▼
Create correct Task Definition revision
              |
              ▼
Update ECS Service
              |
              ▼
Replace running task
              |
              ▼
Test Service Connect hostname again
              |
              ▼
DB CONNECTED
```

---

# 29. DNS Troubleshooting

Inside the application container:

```bash
getent hosts postgres
```

Example:

```text
2600:f0f0::1 postgres postgres
```

This confirmed that the hostname:

```text
postgres
```

could be resolved.

For User:

```bash
getent hosts user-service
```

For Product:

```bash
getent hosts product-service
```

If DNS resolution fails, investigate:

```text
Service Connect
Cloud Map
Namespace
Service registration
Task configuration
```

---

# 30. TCP Troubleshooting

To check whether TCP connectivity exists:

```bash
nc -vz postgres 5432
```

Example:

```text
postgres (127.255.0.1:5432) open
```

This proves that the TCP path appears reachable.

However, it does NOT prove that the PostgreSQL application connection is fully working.

Therefore, an actual PostgreSQL client test is more useful.

---

# 31. PostgreSQL Application-Level Test

From the application container:

```bash
node -e "const {Client}=require('pg'); const c=new Client({host:'postgres',port:5432,database:'foodordering',user:'admin',password:'admin123',ssl:false,connectionTimeoutMillis:5000}); c.connect().then(()=>{console.log('DB CONNECTED');c.end()}).catch(e=>{console.log('DB ERROR:',e.message);c.end()})"
```

Initial result during troubleshooting:

```text
DB ERROR: Connection terminated unexpectedly
```

A direct connection using the PostgreSQL task IP succeeded:

```text
DIRECT DB CONNECTED
```

This was a major diagnostic clue.

It showed that:

```text
PostgreSQL itself was running
+
PostgreSQL could accept connections
+
Direct network connectivity worked
+
The Service Connect path required further investigation
```

After correcting the Service Connect configuration and deploying the updated task:

```text
DB CONNECTED
```

The Service Connect path was working.

---

# 32. Important Difference: TCP vs Application Protocol

This project demonstrated an important troubleshooting concept.

A successful:

```bash
nc -vz postgres 5432
```

does not automatically mean:

```text
PostgreSQL connection = successful
```

It only proves that the TCP connection is available.

A better test uses the actual application protocol.

For PostgreSQL:

```text
Node.js pg Client
       ↓
PostgreSQL protocol
       ↓
Authentication
       ↓
Database connection
```

For HTTP:

```text
HTTP client
       ↓
HTTP request
       ↓
HTTP response
```

---

# 33. Service Connect Troubleshooting Checklist

When service-to-service communication fails, check in this order.

## 1. Check target ECS task

Verify:

```text
Task Status = RUNNING
```

Also check:

```text
Health Status
Task Definition Revision
```

---

## 2. Check application

Verify the application is actually running.

Example:

```text
User application → 3001
Product application → 3002
Order application → 3003
PostgreSQL → 5432
```

---

## 3. Check port mapping

Verify:

```text
Container Port
Protocol
Port Mapping Name
```

Example:

```text
Container Port: 5432
Protocol: TCP
```

---

## 4. Check Service Connect

Verify:

```text
Service Connect = Enabled
Namespace = my-ns
```

---

## 5. Check server/client role

Provider:

```text
Server
```

Consumer:

```text
Client
```

If a service both provides and consumes:

```text
Server + Client
```

---

## 6. Check Service Connect port

Verify that Service Connect references the correct port mapping.

Example:

```text
PostgreSQL
Container Port = 5432
Service Connect Port = 5432
```

---

## 7. Check Service Connect proxy

Verify the task contains the Service Connect proxy container.

Example:

```text
ecs-service-connect-xxxx
```

---

## 8. Check DNS

```bash
getent hosts postgres
```

or:

```bash
getent hosts user-service
```

---

## 9. Check TCP

```bash
nc -vz postgres 5432
```

or:

```bash
nc -vz user-service 3001
```

---

## 10. Check actual application protocol

For PostgreSQL:

```text
pg Client
```

For HTTP:

```text
curl
```

or Node.js HTTP client.

---

# 34. Common Service Connect Failure Indicators

## DNS Failure

Example:

```text
ENOTFOUND user-service
```

Possible areas:

```text
Service Connect
Cloud Map
Namespace
Service registration
DNS/service configuration
```

---

## TCP Failure

Example:

```text
Connection refused
Connection timed out
```

Possible areas:

```text
Security Group
Port mapping
Application not listening
Service Connect
Network configuration
```

---

## Application Protocol Failure

Example:

```text
Connection terminated unexpectedly
```

Possible areas:

```text
Service Connect routing
Application protocol
Database protocol
Application configuration
Target service
```

---

## HTTP 404

Example:

```text
404 Not Found
```

This can actually be a positive troubleshooting result.

It means the request reached the application.

For example:

```text
Order
  ↓
Service Connect
  ↓
Product
  ↓
Product Application
  ↓
HTTP 404
```

At this point networking may already be working.

The next step is to check:

```text
API path
HTTP method
Application routes
```

---

# 35. Task Definition Revisions

Service Connect configuration is part of ECS service/task configuration.

When a task definition configuration needs to change:

```text
Task Definition
      |
      ▼
Create New Revision
      |
      ▼
Update ECS Service
      |
      ▼
Select New Revision
      |
      ▼
Deploy New Task
```

Example:

```text
pg-service:10
pg-service:11
```

The newer revision contains the corrected configuration.

It is important to verify that the running task is actually using the new revision.

---

# 36. Why a New Task Was Important

During troubleshooting, configuration changes were made but old tasks were still running.

This can cause confusion because:

```text
Task Definition
        ≠
Running Task
```

until the service deploys the new revision.

Correct workflow:

```text
Configuration Change
        ↓
Create Revision
        ↓
Update Service
        ↓
Deploy
        ↓
Old Task Replaced
        ↓
New Task Running
        ↓
Test Again
```

Always verify the running task's revision before testing.

---

# 37. Final Service Connect Architecture

```text
                                  AWS ECS
                                     |
                                     ▼
                        Food-application-cluster
                                     |
                   +-----------------+-----------------+
                   |                 |                 |
                   ▼                 ▼                 ▼
             User Service     Product Service     Order Service
                :3001              :3002              :3003
                SERVER              SERVER              CLIENT
                   |                 |                  |
                   |                 |                  |
                   +-----------------+------------------+
                                     |
                                     ▼
                            Service Connect
                                     |
                                     ▼
                                  my-ns
                                     |
                              Cloud Map Namespace
                                     |
                                     ▼
                                PostgreSQL
                                   :5432
```

---

# 38. Complete Service Connect Request

Example:

```text
Order wants Product information
```

Application:

```text
PRODUCT_SERVICE_URL=http://product-service:3002
```

Request:

```text
http://product-service:3002/api/products/123
```

Flow:

```text
Order Application
        |
        ▼
product-service:3002
        |
        ▼
Service Connect Proxy
        |
        ▼
Service Discovery
        |
        ▼
Product Service
        |
        ▼
Product Container :3002
        |
        ▼
Product Application
        |
        ▼
HTTP Response
```

---

# 39. Complete Database Request

Application:

```text
DB_HOST=postgres
DB_PORT=5432
```

Connection:

```text
postgres:5432
```

Flow:

```text
Application Container
        |
        ▼
postgres:5432
        |
        ▼
Service Connect
        |
        ▼
PostgreSQL Task
        |
        ▼
PostgreSQL :5432
        |
        ▼
Database
```

---

# 40. Service Connect vs Application Responsibility

Service Connect is responsible for:

```text
Service discovery
Stable service names
Service-to-service routing
Managed proxy communication
```

The application is responsible for:

```text
API routes
HTTP methods
Request format
Response format
Database queries
Business logic
```

For example:

```text
http://product-service:3002
```

is the Service Connect/service-discovery part.

While:

```text
/api/products/:id
```

is the application/API part.

Therefore, if:

```text
product-service:3002
```

is reachable but the application returns:

```text
404
```

the networking layer may already be functioning correctly.

---

# 41. Real-Time Troubleshooting Mindset

When a service cannot communicate with another service, do not immediately assume the problem is Service Connect.

Troubleshoot layer by layer:

```text
1. ECS Task
      ↓
2. Container
      ↓
3. Application
      ↓
4. Container Port
      ↓
5. Port Mapping
      ↓
6. Security Group
      ↓
7. DNS
      ↓
8. Cloud Map
      ↓
9. Service Connect
      ↓
10. TCP Connectivity
      ↓
11. Application Protocol
      ↓
12. API Endpoint
      ↓
13. Application Logic
```

This prevents changing multiple configurations randomly.

---

# 42. Service Connect Troubleshooting Example From This Project

Initial symptom:

```text
DB ERROR:
Connection terminated unexpectedly
```

PostgreSQL logs:

```text
database system is ready to accept connections
```

This confirmed PostgreSQL itself had started successfully.

Then:

```bash
getent hosts postgres
```

returned the PostgreSQL service name.

Then:

```bash
nc -vz postgres 5432
```

showed the port as open.

But the real PostgreSQL connection still failed through:

```text
postgres:5432
```

A direct PostgreSQL task IP connection succeeded:

```text
DIRECT DB CONNECTED
```

Therefore the investigation focused on the Service Connect path rather than PostgreSQL startup.

The Service Connect configuration, port mapping, task definition revision and service deployment were reviewed.

After correcting the configuration and deploying the new task:

```text
DB CONNECTED
```

This confirmed the Service Connect path was working.

---

# 43. Important Lessons Learned

## Lesson 1

Do not use ECS task IPs in application configuration when Service Connect is being used.

Prefer:

```text
user-service:3001
```

instead of:

```text
172.31.x.x:3001
```

---

## Lesson 2

Port mapping is not the same as Service Connect.

Port mapping tells ECS:

```text
Which application port exists in the container?
```

Service Connect uses that endpoint for:

```text
Service discovery
Service-to-service communication
```

---

## Lesson 3

A port mapping name is only an identifier.

Example:

```text
user-80-tcp
```

does not mean:

```text
Port 80
```

The actual port could be:

```text
3001
```

---

## Lesson 4

TCP connectivity and application connectivity are different.

```text
nc
```

tests TCP.

An actual:

```text
pg Client
```

tests PostgreSQL connectivity.

---

## Lesson 5

A running ECS task does not automatically mean the application is healthy.

Always verify:

```text
Task
Container
Application
Port
Network
Service Discovery
Service Connect
Application Protocol
```

---

## Lesson 6

When changing an ECS task definition:

```text
Create new revision
        ↓
Update service
        ↓
Deploy new task
        ↓
Verify revision
```

Do not assume the running task automatically uses the new configuration.

---

# 44. Quick Interview Revision

### What is ECS Service Connect?

```text
ECS Service Connect provides service discovery and managed
service-to-service communication between ECS services using
stable service names instead of changing task IP addresses.
```

### Why use Service Connect?

```text
Because ECS task IPs can change when tasks are replaced.
Service Connect provides stable service names.
```

### What is a Service Connect namespace?

```text
A logical namespace that groups services participating in
Service Connect service discovery.
```

### What is Cloud Map?

```text
AWS Cloud Map provides service discovery infrastructure
used by ECS Service Connect.
```

### What is a Service Connect proxy?

```text
A managed proxy container that participates in Service Connect
traffic and service-to-service communication.
```

### Why does a server need a port mapping?

```text
The server needs to expose the application port that other
services should consume.
```

### What is a port mapping name?

```text
An identifier for the ECS port mapping. It is not necessarily
the actual application port.
```

### Why can Order be Client only?

```text
Order consumes User and Product services but does not need to
provide a Service Connect endpoint to another service.
```

### When would Order be Server + Client?

```text
When another Service Connect service needs to call Order while
Order also needs to call other services.
```

### Service Connect vs ALB?

```text
ALB:
External/incoming application traffic.

Service Connect:
Internal service-to-service communication.
```

### Service Connect vs Security Group?

```text
Service Connect:
Service discovery and communication.

Security Group:
Network traffic allow/deny rules.
```

### What should you check when Service Connect fails?

```text
1. Task running
2. Application running
3. Correct container port
4. Correct port mapping
5. Security Group
6. Service Connect enabled
7. Namespace
8. Service registration
9. DNS resolution
10. TCP connectivity
11. Application protocol
12. API endpoint
```

---

# 45. Final Mental Model

The easiest way to remember ECS Service Connect is:

```text
                    APPLICATION
                         |
                         | "I need user-service"
                         ▼
                SERVICE NAME
               user-service:3001
                         |
                         ▼
                 SERVICE CONNECT
                         |
                         ▼
                  SERVICE DISCOVERY
                         |
                         ▼
                  CURRENT TASK IP
                         |
                         ▼
                  USER CONTAINER
                         |
                         ▼
                    PORT 3001
```

And the complete relationship is:

```text
Application
    ↓
Container Port
    ↓
ECS Port Mapping
    ↓
Service Connect
    ↓
Cloud Map / Namespace
    ↓
Service Discovery
    ↓
Stable DNS / Service Name
    ↓
Target ECS Task
```

For this project:

```text
user-service:3001
product-service:3002
postgres:5432
```

are the stable internal service endpoints.

The key DevOps concept is:

```text
Service Connect abstracts the changing ECS task IP addresses
and allows microservices to communicate using stable service
names while ECS manages service discovery and routing.
```

---

# 46. Final Project Service Connect Configuration

```text
Namespace:
my-ns
```

```text
USER SERVICE

Port:
3001

Protocol:
TCP

Role:
Server

Service name:
user-service
```

```text
PRODUCT SERVICE

Port:
3002

Protocol:
TCP

Role:
Server

Service name:
product-service
```

```text
ORDER SERVICE

Port:
3003

Protocol:
TCP

Role:
Client

Consumes:
user-service:3001
product-service:3002
```

```text
POSTGRESQL

Port:
5432

Protocol:
TCP

App Protocol:
None

Service name:
postgres
```

---

# 47. Final Architecture Summary

```text
                              INTERNET
                                  |
                                  ▼
                           Application ALB
                                  |
                                  ▼
                         ┌────────────────┐
                         │ Order Service  │
                         │     :3003      │
                         │    CLIENT      │
                         └───────┬────────┘
                                 |
                    ┌────────────┴────────────┐
                    |                         |
                    ▼                         ▼
             user-service:3001       product-service:3002
                    |                         |
                    ▼                         ▼
             ┌──────────────┐         ┌──────────────┐
             │ User Service │         │Product Service│
             │    :3001     │         │    :3002     │
             │    SERVER    │         │    SERVER    │
             └──────────────┘         └──────────────┘
                    |                         |
                    └────────────┬────────────┘
                                 |
                                 ▼
                          postgres:5432
                                 |
                                 ▼
                         ┌──────────────┐
                         │  PostgreSQL  │
                         │    :5432     │
                         └──────────────┘

                  All internal discovery/communication
                           through Service Connect

                              Namespace
                                my-ns

                           AWS Cloud Map
```

# 48. One-Line Interview Answer

> **AWS ECS Service Connect provides managed service discovery and service-to-service communication for ECS services, allowing applications to communicate using stable service names and ports instead of relying on changing ECS task IP addresses.**
