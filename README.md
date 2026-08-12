# 🍔 Food Ordering Microservices — AWS ECS Fargate

A containerized food-ordering microservices application deployed on **AWS ECS Fargate**.

This project was built to practice real-world DevOps concepts including:

- Docker & Docker Compose
- Dockerfiles and containerization
- Amazon ECR
- AWS ECS Fargate
- ECS Task Definitions and revisions
- ECS Services
- Application Load Balancer (ALB)
- Security Groups
- IAM Task Roles and Task Execution Roles
- Amazon CloudWatch Logs
- AWS Cloud Map
- ECS Service Connect
- Microservice-to-microservice communication
- PostgreSQL
- Environment-based configuration
- ECS Exec
- Container networking
- Service discovery
- Troubleshooting ECS deployments

---

# 🏗️ Project Architecture

```text
                              CLIENT
                                │
                                ▼
                    ┌──────────────────────┐
                    │ Application Load      │
                    │ Balancer (ALB)        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    ORDER SERVICE     │
                    │        :3003         │
                    │                      │
                    │   CLIENT / CONSUMER  │
                    └──────────┬───────────┘
                               │
                               │ Service Connect
                               ▼
                    ┌──────────────────────┐
                    │  ECS Service Connect │
                    │                      │
                    │ Namespace: my-ns     │
                    └───────┬─────┬────────┘
                            │     │
                ┌───────────┘     └────────────┐
                ▼                              ▼
       ┌─────────────────┐            ┌─────────────────┐
       │  USER SERVICE   │            │ PRODUCT SERVICE │
       │      :3001      │            │      :3002      │
       │     SERVER      │            │     SERVER      │
       └────────┬────────┘            └────────┬────────┘
                │                              │
                └──────────────┬───────────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │   POSTGRESQL    │
                      │      :5432      │
                      │       DB        │
                      └─────────────────┘
```

---

# ☁️ AWS Architecture

```text
                                  AWS
                                   │
                                   ▼
                              ┌─────────┐
                              │   VPC   │
                              └────┬────┘
                                   │
                                   ▼
                     ┌─────────────────────────┐
                     │      ECS Cluster        │
                     │ Food-application-cluster│
                     └────────────┬────────────┘
                                  │
          ┌───────────────────────┼────────────────────────┐
          │                       │                        │
          ▼                       ▼                        ▼
 ┌─────────────────┐     ┌─────────────────┐      ┌─────────────────┐
 │  Order Service  │     │  User Service   │      │ Product Service │
 │      :3003      │     │      :3001      │      │      :3002      │
 │ ECS Fargate     │     │ ECS Fargate     │      │ ECS Fargate     │
 │ + SC Proxy      │     │ + SC Proxy      │      │ + SC Proxy      │
 └────────┬────────┘     └────────┬────────┘      └────────┬────────┘
          │                       │                        │
          └───────────────────────┼────────────────────────┘
                                  │
                          Service Connect
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │ AWS Cloud Map        │
                       │ Namespace: my-ns     │
                       └─────────────────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │   PostgreSQL ECS    │
                       │       :5432         │
                       └─────────────────────┘


Supporting AWS Services
────────────────────────────────────────────

ECR
 └── Stores Docker images

IAM
 ├── Task Role
 └── Task Execution Role

CloudWatch
 └── Container logs

ALB
 └── External application traffic

Cloud Map
 └── Service discovery

ECS Exec
 └── Debugging running containers
```

---

# 📦 Microservices

## 1. User Service

**Port:** `3001`

Responsible for user-related functionality such as:

- User registration
- User authentication
- User information
- JWT-based authentication

The User Service exposes APIs consumed by other services.

```text
User Service = SERVER / PROVIDER
```

---

## 2. Product Service

**Port:** `3002`

Responsible for product/catalog functionality such as:

- Product information
- Product lookup
- Product details

Example endpoint:

```text
GET /api/products/:id
```

```text
Product Service = SERVER / PROVIDER
```

---

## 3. Order Service

**Port:** `3003`

Responsible for:

- Creating orders
- Processing order requests
- Communicating with User Service
- Communicating with Product Service

Internal configuration:

```text
USER_SERVICE_URL=http://user-service:3001
PRODUCT_SERVICE_URL=http://product-service:3002
```

```text
Order Service = CLIENT / CONSUMER
```

---

## 4. PostgreSQL

**Port:** `5432`

PostgreSQL is used as the relational database.

```text
Database : foodordering
User     : admin
Port     : 5432
```

PostgreSQL was deployed as a separate ECS service/task.

---

# 🐳 Docker

Each application component was containerized independently.

```text
                 Docker
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
     User       Product     Order
     :3001       :3002      :3003
        │          │          │
        └──────────┼──────────┘
                   │
                   ▼
               PostgreSQL
                  :5432
```

Docker Compose was used during local development.

The services shared:

```text
food-ordering-network
```

Containers communicate using service names instead of hardcoded container IP addresses.

Example:

```text
DB_HOST=postgres
```

instead of:

```text
DB_HOST=localhost
```

---

# 🧩 Docker Compose Configuration

PostgreSQL:

```yaml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: foodordering
    POSTGRES_USER: admin
    POSTGRES_PASSWORD: admin123
  ports:
    - "5432:5432"
```

User Service:

```text
DB_HOST=postgres
DB_PORT=5432
DB_NAME=foodordering
DB_USER=admin
DB_PASSWORD=admin123
```

Product Service:

```text
DB_HOST=postgres
DB_PORT=5432
DB_NAME=foodordering
DB_USER=admin
DB_PASSWORD=admin123
```

Order Service:

```text
DB_HOST=postgres
DB_PORT=5432
DB_NAME=foodordering
DB_USER=admin
DB_PASSWORD=admin123

USER_SERVICE_URL=http://user-service:3001
PRODUCT_SERVICE_URL=http://product-service:3002
```

Common Docker network:

```yaml
networks:
  food-ordering-network:
    driver: bridge
```

---

# 🗄️ PostgreSQL Connection

The Node.js services use the PostgreSQL `pg` package.

Example:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'foodordering',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  max: 20,
  idleTimeoutMillis: 30000,
});

module.exports = pool;
```

Important:

```text
Docker Compose:
DB_HOST=postgres

ECS:
Database communication is handled through ECS networking / Service Connect configuration.
```

---

# 🚀 Amazon ECR

Docker images were pushed to Amazon ECR before ECS deployment.

Deployment flow:

```text
Application Code
       │
       ▼
   Dockerfile
       │
       ▼
 docker build
       │
       ▼
 Docker Image
       │
       ▼
     ECR
       │
       ▼
 ECS Fargate
       │
       ▼
 Running Container
```

Typical commands:

```bash
docker build -t user-service .
```

```bash
docker tag user-service:latest \
<ACCOUNT_ID>.dkr.ecr.eu-north-1.amazonaws.com/<REPOSITORY>:latest
```

```bash
docker push \
<ACCOUNT_ID>.dkr.ecr.eu-north-1.amazonaws.com/<REPOSITORY>:latest
```

---

# ☁️ ECS Fargate

Cluster:

```text
Food-application-cluster
```

Services:

```text
user-service
product-service
order-service
pg-service
```

Architecture:

```text
ECS Cluster
│
├── user-service
│     └── Fargate Task
│
├── product-service
│     └── Fargate Task
│
├── order-service
│     └── Fargate Task
│
└── pg-service
      └── Fargate Task
```

Fargate was used as the capacity provider, so EC2 servers did not have to be managed for the ECS workloads.

Platform:

```text
Linux / X86_64
Fargate Platform Version: 1.4.0
```

---

# 📋 ECS Task Definitions

Each service has an ECS Task Definition.

The Task Definition contains:

- Container image
- CPU
- Memory
- Container port
- Port mapping
- Environment variables
- Task role
- Task execution role
- CloudWatch logging
- Health check
- Service Connect configuration

Task Definition revisions are immutable.

When configuration needs to change:

```text
Modify Task Definition
        │
        ▼
Create New Revision
        │
        ▼
Update ECS Service
        │
        ▼
Select New Revision
        │
        ▼
New Task Deployment
```

Example:

```text
pg-service:10
pg-service:11
```

Revision `11` represents the newer configuration.

---

# 🔌 ECS Port Mapping

Port mapping tells ECS which port the application container listens on.

User Service:

```text
Container Port : 3001
Protocol       : TCP
```

Product Service:

```text
Container Port : 3002
Protocol       : TCP
```

Order Service:

```text
Container Port : 3003
Protocol       : TCP
```

PostgreSQL:

```text
Container Port : 5432
Protocol       : TCP
```

Conceptually:

```text
Application
     │
     ▼
Container Port
     │
     ▼
ECS Port Mapping
     │
     ▼
Service Connect / Network
```

---

# 🏷️ Port Mapping Name

A port mapping can have a name such as:

```text
user-80-tcp
```

This is only the **port mapping name**.

It does NOT mean the application runs on port 80.

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

For PostgreSQL:

```text
Port Mapping Name : main-5432-tcp
Container Port    : 5432
Protocol          : TCP
```

The port mapping name is mainly used to associate the port with ECS/Service Connect configuration.

---

# 🔐 IAM

Two different IAM roles are important for ECS tasks.

## Task Role

The Task Role gives permissions to the **application running inside the container**.

```text
Application Container
        │
        ▼
     Task Role
        │
        ▼
    AWS APIs
```

Task role used:

```text
ECS-task
```

---

## Task Execution Role

The Task Execution Role is used by ECS/Fargate itself to perform operations required to start and run the task.

Examples:

- Pull images from ECR
- Send logs to CloudWatch
- Retrieve required resources

Execution role:

```text
ecsTaskExecutionRole
```

Key difference:

```text
TASK ROLE
    ↓
Application permissions


TASK EXECUTION ROLE
    ↓
ECS/Fargate infrastructure permissions
```

---

# 📊 CloudWatch Logs

Container logging was configured using the `awslogs` driver.

Example:

```text
Log driver:
awslogs

awslogs-create-group:
true

awslogs-group:
/ecs/pg-service

awslogs-region:
eu-north-1

awslogs-stream-prefix:
ecs
```

Initial task startup failed because the execution role did not have the required CloudWatch Logs permission.

Error:

```text
ResourceInitializationError

failed to validate logger args

AccessDeniedException:
User ... assumed-role/ecsTaskExecutionRole ...

is not authorized to perform:
logs:CreateLogGroup
```

The important point was that the error explicitly showed:

```text
ecsTaskExecutionRole
```

Therefore the permission needed to be fixed on the **Task Execution Role**, not the application Task Role.

Required CloudWatch permissions include:

```text
logs:CreateLogGroup
logs:CreateLogStream
logs:PutLogEvents
```

After correcting the permissions, PostgreSQL logs became visible.

Example:

```text
database system is ready to accept connections
```

---

# 🌐 Application Load Balancer

The ALB provides external access to the application.

```text
Client
  │
  ▼
ALB
  │
  ▼
Target Group
  │
  ▼
ECS Service
  │
  ▼
Fargate Task
```

The ALB handles incoming application traffic while internal microservice communication is handled separately through Service Connect.

---

# 🔥 Security Groups

Security Groups control network traffic to ECS tasks and supporting resources.

Typical traffic requirements:

```text
Client
   │
   ▼
ALB
   │
   ▼
Application Service
```

Internal traffic:

```text
Order ───────→ User
Order ───────→ Product
Services ────→ PostgreSQL
```

Security groups should allow only the required ports and sources rather than opening all traffic unnecessarily.

---

# 🔗 ECS Service Connect

Service Connect was one of the major concepts and troubleshooting areas of this project.

Service Connect provides:

- Service discovery
- Stable service names
- Service-to-service communication
- Managed proxy-based communication
- Integration with AWS Cloud Map

Namespace used:

```text
my-ns
```

Cloud Map namespace:

```text
arn:aws:servicediscovery:eu-north-1:161020170241:namespace/ns-cvbd3nofqv47qqby
```

---

# 🧠 Service Connect Concept

Without Service Connect:

```text
Order
  │
  ▼
Need User task IP
  │
  ▼
172.31.x.x:3001
```

The task IP can change when ECS replaces a task.

With Service Connect:

```text
Order
  │
  ▼
user-service:3001
  │
  ▼
Service Connect
  │
  ▼
Current User Task
```

The application does not need to know the changing task IP.

---

# 🏗️ Service Connect Architecture

```text
                     my-ns
                       │
               Service Connect
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
       User         Product       Order
       :3001         :3002        :3003
       SERVER        SERVER       CLIENT
          ▲            ▲            │
          │            │            │
          └────────────┴────────────┘
                       │
                 Service Discovery
```

Each Service Connect-enabled task can have an additional managed proxy container.

Example:

```text
Order Task
│
├── Main
└── ecs-service-connect-xxxx
```

The Service Connect proxy handles service-to-service communication.

---

# 👨‍🍳 Simple Service Connect Analogy

```text
User Service
= Kitchen
= Provides functionality
= SERVER

Product Service
= Kitchen
= Provides functionality
= SERVER

Order Service
= Waiter
= Requests functionality from other services
= CLIENT
```

If another service also needed to call Order:

```text
Order = SERVER + CLIENT
```

---

# 🖥️ Service Connect Client and Server Modes

## Client Only

A client-only service consumes other services.

Example:

```text
Order
  │
  ├──→ User
  └──→ Product
```

Order does not expose a Service Connect endpoint.

Therefore:

```text
Order = Client only
```

---

## Client and Server

A service can both provide its own endpoint and consume other services.

Example:

```text
Notification
       │
       ▼
     Order
       │
       ├──→ User
       └──→ Product
```

Order is now:

```text
Server + Client
```

---

# 🔌 Service Connect and Port Mapping

This is one of the most important concepts from the troubleshooting.

A server needs to expose an application port.

Example:

```text
User Application
       │
       ▼
Container Port 3001
       │
       ▼
ECS Port Mapping
       │
       ▼
Service Connect
       │
       ▼
user-service:3001
```

For Product:

```text
Product Application
       │
       ▼
Container Port 3002
       │
       ▼
ECS Port Mapping
       │
       ▼
Service Connect
       │
       ▼
product-service:3002
```

For PostgreSQL:

```text
PostgreSQL
       │
       ▼
Container Port 5432
       │
       ▼
ECS Port Mapping
       │
       ▼
Service Connect
       │
       ▼
postgres:5432
```

---

# 🏷️ Service Connect Port Alias

A Service Connect server configuration can reference a port mapping.

Example:

```text
Port Mapping:
main-5432-tcp

Container Port:
5432
```

Service Connect can then expose that service through:

```text
Discovery Name:
postgres

DNS:
postgres

Port:
5432
```

The important relationship is:

```text
Port Mapping
     ↓
Container Port
     ↓
Service Connect Endpoint
     ↓
DNS Name
```

---

# 🔍 Service Connect DNS

The application can use:

```text
http://user-service:3001
```

instead of:

```text
http://172.31.x.x:3001
```

Similarly:

```text
http://product-service:3002
```

and:

```text
postgres:5432
```

The stable service name is the important part.

---

# 🔄 Service Connect Request Flow

Example: Order calling Product.

```text
Order Application
       │
       │
       │ http://product-service:3002
       ▼
Service Connect Proxy
       │
       ▼
Service Discovery
       │
       ▼
Product Task
       │
       ▼
Product Container :3002
```

The application does not need the Product task's IP.

---

# 🧪 ECS Exec

ECS Exec was enabled to troubleshoot running containers.

Before enabling:

```text
ECS Exec: OFF
```

After enabling the service and deploying a new task:

```text
ECS Exec: ON
```

Important:

Changing the ECS service configuration does not automatically make an already-running task show ECS Exec as enabled.

A new task deployment was required.

Conceptually:

```text
Enable ECS Exec
       │
       ▼
Update ECS Service
       │
       ▼
Stop / Replace Old Task
       │
       ▼
New Task
       │
       ▼
ECS Exec Enabled
```

ECS Exec was then used to enter the running container:

```text
Starting session with SessionId:
ecs-execute-command-xxxx
```

Inside the container:

```text
/myapp #
```

---

# 🧪 ECS Troubleshooting Commands

Inside a running container, useful commands included:

```bash
getent hosts postgres
```

This checks whether the hostname can be resolved.

Example:

```text
postgres  postgres
```

Then:

```bash
nc -vz postgres 5432
```

This checks whether TCP connectivity to port 5432 is available.

Example:

```text
postgres (127.255.0.1:5432) open
```

A TCP connection being open does not automatically prove that PostgreSQL authentication/application connectivity is working.

Therefore Node.js was used for an actual PostgreSQL connection test.

---

# 🧪 PostgreSQL Connectivity Test

From the application container:

```bash
node -e "const {Client}=require('pg'); const c=new Client({host:'postgres',port:5432,database:'foodordering',user:'admin',password:'admin123',ssl:false,connectionTimeoutMillis:5000}); c.connect().then(()=>{console.log('DB CONNECTED');c.end()}).catch(e=>{console.log('DB ERROR:',e.message);c.end()})"
```

Initial result:

```text
DB ERROR: Connection terminated unexpectedly
```

A direct connection using the PostgreSQL task IP succeeded:

```text
DIRECT DB CONNECTED
```

This was a very important troubleshooting clue.

It indicated:

```text
PostgreSQL itself was running
        +
Network connectivity to the task IP worked
        +
The problem was specifically around the Service Connect path
```

After correcting the Service Connect configuration and redeploying the task, the same Service Connect hostname test succeeded:

```text
DB CONNECTED
```

---

# 🛠️ Service Connect Troubleshooting Journey

The major infrastructure issue in this project was Service Connect communication.

The troubleshooting process was:

```text
Application cannot connect to DB
            │
            ▼
Check PostgreSQL task
            │
            ▼
PostgreSQL logs:
database system is ready to accept connections
            │
            ▼
Check ECS Exec
            │
            ▼
Check DNS
            │
            ▼
getent hosts postgres
            │
            ▼
Hostname resolves
            │
            ▼
Check TCP
            │
            ▼
nc -vz postgres 5432
            │
            ▼
Port appears open
            │
            ▼
Perform actual PostgreSQL connection test
            │
            ▼
Connection terminated unexpectedly
            │
            ▼
Test using PostgreSQL task IP directly
            │
            ▼
DIRECT DB CONNECTED
            │
            ▼
Service Connect path identified
            │
            ▼
Review Service Connect configuration
            │
            ▼
Review port mapping
            │
            ▼
Review server/client configuration
            │
            ▼
Create correct Task Definition revision
            │
            ▼
Update ECS Service
            │
            ▼
Replace running task
            │
            ▼
Test again
            │
            ▼
DB CONNECTED
```

---

# 🔎 Important Service Connect Troubleshooting Checks

When Service Connect communication fails, check in this order:

## 1. Is the target ECS task running?

```text
ECS → Cluster → Service → Tasks
```

Check:

```text
Last Status = RUNNING
Health Status = HEALTHY
```

---

## 2. Is the application actually listening on the expected port?

Example:

```text
PostgreSQL → 5432
User       → 3001
Product    → 3002
Order      → 3003
```

---

## 3. Is the ECS port mapping correct?

Check:

```text
Container port
Protocol
Port mapping name
```

Example:

```text
Container Port: 5432
Protocol: TCP
```

---

## 4. Is Service Connect enabled?

Check the ECS Service configuration.

Verify:

```text
Use Service Connect = enabled
Namespace = my-ns
```

---

## 5. Is the service configured as the correct type?

Provider service:

```text
Client and server
```

Consumer-only service:

```text
Client only
```

---

## 6. Is the Service Connect port correctly associated?

For PostgreSQL:

```text
Port Mapping → 5432
Service Connect Port → 5432
Discovery Name → postgres
DNS Name → postgres
```

---

## 7. Check Service Connect proxy

The task may contain:

```text
Main
ecs-service-connect-xxxx
```

The Service Connect proxy should be running.

---

## 8. Test DNS

Inside the client container:

```bash
getent hosts postgres
```

or:

```bash
getent hosts user-service
```

---

## 9. Test TCP connectivity

```bash
nc -vz postgres 5432
```

or:

```bash
nc -vz user-service 3001
```

---

## 10. Test the actual application protocol

A successful TCP connection alone is not enough.

For PostgreSQL:

```text
Use pg Client
```

For HTTP:

```text
Use curl
```

or Node.js if curl is not installed.

---

# ⚠️ Important Lesson: TCP Connectivity vs Application Connectivity

This project demonstrated an important troubleshooting principle.

This:

```text
nc -vz postgres 5432
```

returning:

```text
open
```

does not necessarily mean:

```text
PostgreSQL application connection = working
```

It only proves that the TCP path is available.

A better test is to use the actual protocol.

For PostgreSQL:

```text
Node.js pg Client
       ↓
PostgreSQL authentication
       ↓
Database connection
```

For HTTP:

```text
curl / Node.js HTTP request
       ↓
HTTP response
```

---

# 🔄 ECS Task Replacement After Configuration Changes

A common issue during troubleshooting was changing the ECS service or task definition but continuing to test an old running task.

The safe workflow is:

```text
Change configuration
        │
        ▼
Create new Task Definition revision
        │
        ▼
Update ECS Service
        │
        ▼
Deploy new revision
        │
        ▼
Stop / replace old task
        │
        ▼
Verify new task
        │
        ▼
Test
```

Always verify:

```text
Running Task
Task Definition Revision
ECS Exec status
Service Connect configuration
```

before testing.

---

# 🧠 Troubleshooting Lessons

## Lesson 1 — Don't assume "task is running" means application is working

A task can be:

```text
RUNNING
```

while the application still has:

- Database connectivity problems
- Service discovery problems
- Configuration problems
- Application startup problems

---

## Lesson 2 — Check the actual error message

Example:

```text
AccessDeniedException
logs:CreateLogGroup
```

Immediately points toward:

```text
IAM / CloudWatch Logs
```

Example:

```text
ENOTFOUND user-service
```

points toward:

```text
DNS / Service Discovery / Service Connect
```

Example:

```text
Connection terminated unexpectedly
```

requires deeper application/database/network investigation.

---

## Lesson 3 — Separate infrastructure from application problems

A microservice request can fail at different layers:

```text
1. ECS task
      ↓
2. Container
      ↓
3. Port
      ↓
4. Network
      ↓
5. Service Discovery
      ↓
6. Service Connect
      ↓
7. HTTP / PostgreSQL protocol
      ↓
8. API endpoint
      ↓
9. Application logic
```

Troubleshoot from the bottom upward instead of changing everything at once.

---

# 🧭 Final Troubleshooting Method

When a microservice cannot communicate with another service:

```text
Is target task RUNNING?
        ↓
Is target container HEALTHY?
        ↓
Is application listening on expected port?
        ↓
Is port mapping correct?
        ↓
Is Security Group allowing traffic?
        ↓
Is Service Connect enabled?
        ↓
Is the service registered?
        ↓
Does DNS resolve?
        ↓
Does TCP connect?
        ↓
Does the actual protocol connect?
        ↓
Does the API endpoint exist?
        ↓
Does the application logic work?
```

This approach prevents random configuration changes.

---

# 📌 Important Difference: Service Connect vs API Path

Service Connect is responsible for:

```text
Service discovery
Networking
Service-to-service routing
Stable service names
```

Example:

```text
http://product-service:3002
```

The application is responsible for:

```text
API paths
HTTP methods
Request structure
Response structure
Business logic
```

Example:

```text
/api/products/:id
```

Therefore, if:

```text
product-service:3002
```

successfully reaches the Product Service but returns:

```text
404
```

then Service Connect/networking is working.

The next thing to investigate is the application/API route.

---

# 🔑 Environment Variable vs API Path

Order Service configuration:

```text
PRODUCT_SERVICE_URL=http://product-service:3002
```

Application code constructs:

```text
${PRODUCT_SERVICE_URL}/api/products/${productId}
```

Final request:

```text
http://product-service:3002/api/products/<product-id>
```

Important principle:

```text
Environment Variable
        +
Application Code
        =
Final Request URL
```

Always inspect both before changing configuration.

---

# 📊 Complete Request Flow

```text
Client
  │
  ▼
ALB
  │
  ▼
Order Service :3003
  │
  │
  ├─────────────── Service Connect ───────────────┐
  │                                               │
  ▼                                               ▼
User Service :3001                         Product Service :3002
  │                                               │
  │                                               │
  └───────────────────┬───────────────────────────┘
                      │
                      ▼
                 PostgreSQL :5432
```

---

# 🧩 Final Service Roles

```text
Service             Port       Role

User Service        3001       Service Connect Server
Product Service     3002       Service Connect Server
Order Service       3003       Service Connect Client
PostgreSQL          5432       Database / Service endpoint
```

If Order also needed to be called by another microservice:

```text
Order Service = Client + Server
```

---

# 🏁 Final Project Flow

```text
1. Develop microservices
        ↓
2. Create Dockerfiles
        ↓
3. Build Docker images
        ↓
4. Test using Docker Compose
        ↓
5. Push images to Amazon ECR
        ↓
6. Create ECS Cluster
        ↓
7. Create ECS Task Definitions
        ↓
8. Configure IAM roles
        ↓
9. Configure CloudWatch logging
        ↓
10. Create ECS Services
        ↓
11. Configure ALB
        ↓
12. Configure Security Groups
        ↓
13. Configure Cloud Map namespace
        ↓
14. Configure ECS Service Connect
        ↓
15. Deploy Fargate tasks
        ↓
16. Enable ECS Exec for troubleshooting
        ↓
17. Test service discovery
        ↓
18. Test TCP connectivity
        ↓
19. Test application protocol
        ↓
20. Verify microservice communication
        ↓
21. Verify database connectivity
        ↓
22. Validate complete application flow
```

---

# 🧠 Interview Quick Revision

### Why ECS Fargate?

```text
Serverless container execution.
No EC2 instance management required.
```

### Why ECR?

```text
Private container image registry used by ECS to pull images.
```

### Task Role vs Execution Role?

```text
Task Role:
Application permissions.

Execution Role:
ECS/Fargate permissions required to run the task.
```

### Why CloudWatch?

```text
Centralized container/application logs.
```

### Why ECS Exec?

```text
To securely enter a running ECS container for troubleshooting.
```

### Why Service Connect?

```text
To provide service discovery and managed service-to-service
communication using stable service names instead of task IPs.
```

### Why port mapping?

```text
It tells ECS which application port is exposed by the container
and allows ECS/Service Connect to associate the service with
the correct container port.
```

### Why Cloud Map?

```text
Provides service discovery namespace infrastructure used by
ECS Service Connect.
```

### Why Service Connect Server?

```text
A server/provider exposes an endpoint that other services can consume.
```

### Why Service Connect Client?

```text
A client/consumer connects to endpoints exposed by other services.
```

### Why use service names instead of IP addresses?

```text
Task IPs can change when ECS replaces tasks.

Stable service name:
user-service:3001

Changing task IP:
172.31.x.x:3001
```

Service Connect hides this infrastructure-level change from the application.

---

# 🎯 Key DevOps Takeaways

This project provided hands-on experience with:

```text
Docker
   ↓
ECR
   ↓
ECS Fargate
   ↓
Task Definitions
   ↓
IAM
   ↓
CloudWatch
   ↓
ALB
   ↓
Security Groups
   ↓
Cloud Map
   ↓
Service Connect
   ↓
ECS Exec
   ↓
Microservice Networking
   ↓
PostgreSQL
```

The most important troubleshooting lesson was:

```text
Don't immediately assume every application failure is a
networking failure.

Identify the layer first.
```

A good real-world troubleshooting sequence is:

```text
Task
 ↓
Container
 ↓
Port
 ↓
Security Group
 ↓
DNS
 ↓
Service Connect
 ↓
TCP
 ↓
Application Protocol
 ↓
API Endpoint
 ↓
Application Logic
```

This project demonstrates practical experience deploying and troubleshooting a multi-service containerized application on AWS ECS Fargate.
