![Babcock university logo
](media/image1.jpeg){width="3.9854166666666666in"
height="1.9993044619422573in"}

**SMART GYM ACCESS AND MANAGEMENT SYSTEM FOR**

**BABCOCK UNIVERSITY FITNESS CENTRES**

**BY**

**OLUFUYE MICHAEL JESUDUNNI**

**22/0294**

**ACHO IHIM CHIDERA**

**22/0233**

**OCHI CHINEMEREM FAVOUR**

**22/0055**

**A PROJECT WORK SUBMITTED IN PARTIAL FULFILMENT OF THE REQUIREMENTS FOR
THE AWARD OF BACHELOR OF SCIENCE B.SC (HONS) DEGREE IN SOFTWARE
ENGINEERING**

**TO THE DEPARTMENT OF SOFTWARE ENGINEERING**

**SCHOOL OF COMPUTING, BABCOCK UNIVERSITY,**

**ILISHAN-REMO, OGUN STATE, NIGERIA**

**OCTOBER, 2025**

# 

# CERTIFICATION

We hereby certify that the project was carried out by the under listed
students under the supervision of the Department of Software
Engineering, School of Computing, Babcock University, Ilishan-Remo, Ogun
State, Nigeria.

+:----------------------------------------------+---------------------:+
| > OLUFUYE MICHAEL JESUDUNNI                   | 22/0294              |
+-----------------------------------------------+----------------------+
| > ACHO IHIM CHIDERA                           | 22/0233              |
+-----------------------------------------------+----------------------+
| > OCHI CHINEMEREM FAVOUR                      | 22/0055              |
+-----------------------------------------------+----------------------+

DR ADEKOLA OLUBUKOLA ....................................

(SUPERVISOR) SIGNATURE/DATE

........................................
...................................

EXTERNAL EXAMINER SIGNATURE/DATE

DR MAITANMI OLUSHOLA ...................................

(HEAD OF DEPARTMENT) SIGNATURE/DATE

# 

# 

# DEDICATION

First and foremost, in humble reverence to the Almighty God, we thank
Him for blessing us with wisdom, knowledge, good health and insight that
was necessary for the completion of this work. This project is also
dedicated to our parents, family and friends and loved ones whose
unwavering support and encouragement have been a constant source of
strength. Also to our mentors and educators, whose guidance and wisdom
have shaped our academic journey as a testament to their dedication.

# 

# 

# 

# ACKNOWLEDGMENT

Our greatest gratitude goes to the Almighty God for giving us the
strength and making us capable of completing this project successfully
and in good time. We also want to use this medium to thank everyone who
has contributed to this project in one way or another. To our wonderful
parents, words cannot express how much we appreciate your constant love
and support. Also, we would love to thank our project supervisor, DR
ADEKOLA OLUBUKOLA. For his patience and intelligent suggestions in
carrying out this project.

Finally, we appreciate the entire School of Computing, and the
Department of Software Engineering. We appreciate you all and God bless
you for all the efforts you have put in making us who we are today.

# 

# 

# ABSTRACT

The manual operational model of the Babcock University Fitness Centre
presents significant challenges, including payment disputes, inefficient
attendance tracking, and disorganized trainer scheduling, which
undermine service quality and administrative oversight. This project
aims to address these inefficiencies by designing and developing a
web-based Smart Gym Management System to automate core operations.
Adopting the Incremental software development lifecycle, the system was
engineered using a modern serverless architecture comprising React,
Vite, TypeScript, and Tailwind CSS for the presentation layer,
integrated directly with Firebase Authentication and Cloud Firestore for
backend data management. The system integrates a simulated payment
gateway for online subscriptions, implements time-stamped QR code
technology for digital attendance verification, provides a flexible
trainer booking module that accommodates general session scheduling and
allows members to record their workout information. Findings from the
system implementation and testing indicate that the platform
successfully eliminates manual payment tracking errors, significantly
reduces check-in bottlenecks at the entrance, and provides
administrators with accurate, real-time analytics regarding facility
utilization and revenue tracking. In conclusion, the deployment of this
serverless web application effectively transitions the fitness centre
from a manual paradigm to a highly efficient digital ecosystem, directly
aligning with the university's broader smart campus initiatives. For
further studies, it is recommended that future iterations integrate live
financial payment gateways such as Paystack, implement dedicated native
mobile applications, and incorporate Internet of Things (IoT) sensors
for live equipment tracking.

Keywords: Access, Authentication, Firebase, Management, Scheduling.

Word Count: 230

# TABLE OF CONTENTS

[CERTIFICATION [II](#certification)](#certification)

[DEDICATION [III](#dedication)](#dedication)

[ACKNOWLEDGMENT [IV](#acknowledgment)](#acknowledgment)

[ABSTRACT [V](#abstract)](#abstract)

[TABLE OF CONTENTS [VI](#table-of-contents)](#table-of-contents)

[LIST OF FIGURES [VIII](#list-of-figures)](#list-of-figures)

[LIST OF TABLES [X](#list-of-tables)](#list-of-tables)

[CHAPTER ONE(INTRODUCTION)
[11](#chapter-oneintroduction)](#chapter-oneintroduction)

[1.1 Background of The Study
[11](#background-of-the-study)](#background-of-the-study)

[1.2 Problem Statement [12](#problem-statement)](#problem-statement)

[1.3 Aim and Specific Objectives
[13](#aim-and-specific-objectives)](#aim-and-specific-objectives)

[1.4 Methodology Overview
[14](#methodology-overview)](#methodology-overview)

[1.5 Scope and Limitations of the Study
[15](#scope-and-limitations-of-the-study)](#scope-and-limitations-of-the-study)

[1.6 Significance of the Study
[16](#significance-of-the-study)](#significance-of-the-study)

[1.7 Definition of Terms
[17](#definition-of-terms)](#definition-of-terms)

[CHAPTER TWO (LITERATURE REVIEW)
[19](#chapter-two-literature-review)](#chapter-two-literature-review)

[2.1 Background of the Research
[19](#background-of-the-research)](#background-of-the-research)

[2.2 Overview of Existing System
[20](#overview-of-existing-system)](#overview-of-existing-system)

[2.3 Review of Related Work
[21](#review-of-related-work)](#review-of-related-work)

[2.4 Potential Challenges in System Implementation
[29](#potential-challenges-in-system-implementation)](#potential-challenges-in-system-implementation)

[2.5 Summary of Literature Review and Research Gap
[32](#summary-of-literature-review-and-research-gap)](#summary-of-literature-review-and-research-gap)

[CHAPTER THREE (SYSTEM ANALYSIS AND DESIGN)
[33](#chapter-three-system-analysis-and-design)](#chapter-three-system-analysis-and-design)

[3.1 System Analysis and Methodology Overview
[33](#system-analysis-and-methodology-overview)](#system-analysis-and-methodology-overview)

[3.2 Overview of the Proposed System
[33](#overview-of-the-proposed-system)](#overview-of-the-proposed-system)

[3.3 System Requirements Specification
[34](#system-requirements-specification)](#system-requirements-specification)

[3.4 System Architecture Overview
[36](#system-architecture-overview)](#system-architecture-overview)

[3.5 Process Models [37](#process-models)](#process-models)

[3.6 Flowchart for User Log In
[39](#flowchart-for-user-log-in)](#flowchart-for-user-log-in)

[3.7 Use Case Diagram [40](#use-case-diagram)](#use-case-diagram)

[3.8 Sequence Diagrams [41](#sequence-diagrams)](#sequence-diagrams)

[3.9 Class Diagram [44](#class-diagram)](#class-diagram)

[3.10 Database Design [45](#database-design)](#database-design)

[3.11 Development Tools and Frameworks
[46](#development-tools-and-frameworks)](#development-tools-and-frameworks)

[CHAPTER FOUR (SYSTEM IMPLEMENTATION)
[47](#chapter-four-system-implementation)](#chapter-four-system-implementation)

[4.1 Implementation Overview
[47](#implementation-overview)](#implementation-overview)

[4.2 Graphical User Interface of the Project
[47](#graphical-user-interface-of-the-project)](#graphical-user-interface-of-the-project)

[4.3 Software Testing [58](#software-testing)](#software-testing)

[CHAPTER FIVE (CONCLUSION AND RECOMMENDATIONS)
[64](#chapter-five-conclusion-and-recommendations)](#chapter-five-conclusion-and-recommendations)

[5.1 Summary of the Study
[64](#summary-of-the-study)](#summary-of-the-study)

[5.2 Conclusion [64](#conclusion)](#conclusion)

[5.3 Recommendations [65](#recommendations)](#recommendations)

[5.4 Future Directions [65](#future-directions)](#future-directions)

[REFERENCES [66](#references)](#references)

[APPENDIX A [68](#appendix-a)](#appendix-a)

# LIST OF FIGURES

[Figure 3.1 : System Architecture Model [37](#_Toc21408)](#_Toc21408)

[Figure 3.2 : System Incremental Process Model
[39](#_Toc15274)](#_Toc15274)

[Figure 3.3 : System Flowchart Model [40](#_Toc15953)](#_Toc15953)

[Figure 3.4 : System Use Case Diagram [41](#_Toc24950)](#_Toc24950)

[Figure 3.5 : System Payment Sequence Diagram
[42](#_Toc21958)](#_Toc21958)

[Figure 3.6 : System Trainer Scheduling Sequence Diagram
[43](#_Toc19255)](#_Toc19255)

[Figure 3.7 : System QR Code Validation Sequence Diagram
[44](#_Toc23169)](#_Toc23169)

[Figure 3.8 : System Class Diagram [45](#_Toc13093)](#_Toc13093)

[Figure 3.9 : System Entity Relationship Diagram
[46](#_Toc31502)](#_Toc31502)

[Figure 4.1 : System Landing Page [48](#_Toc29642)](#_Toc29642)

[Figure 4.2 : User Registration Interface [49](#_Toc23270)](#_Toc23270)

[Figure 4.3 : User Login Interface [49](#_Toc26117)](#_Toc26117)

[Figure 4.4 : Member Dashboard Interface [50](#_Toc21241)](#_Toc21241)

[Figure 4.5 : Trainer Booking Interface [51](#_Toc13139)](#_Toc13139)

[Figure 4.6 : Attendance History Interface [51](#_Toc27583)](#_Toc27583)

[Figure 4.7 : Payment and Billing Interface
[52](#_Toc15265)](#_Toc15265)

[Figure 4.8 : Workout Tracking Interface [52](#_Toc30617)](#_Toc30617)

[Figure 4.9 : Trainer Dashboard Interface [53](#_Toc9513)](#_Toc9513)

[Figure 4.10 : Weekly Schedule Interface [54](#_Toc8260)](#_Toc8260)

[Figure 4.11 : Sessions Interface [54](#_Toc30894)](#_Toc30894)

[Figure 4.12 : Admin Dashboard Interface [55](#_Toc26669)](#_Toc26669)

[Figure 4.13 : Check-in Scanner Interface [56](#_Toc8277)](#_Toc8277)

[Figure 4.14 : Trainer Management Interface
[56](#_Toc31355)](#_Toc31355)

[Figure 4.15 : Member Management Interface [57](#_Toc11994)](#_Toc11994)

[Figure 4.16 : Reports and Analytics Interface
[57](#_Toc3557)](#_Toc3557)

# 

# LIST OF TABLES

[Table 2.1 : Summary of Reviewed Literature
[21](#_Toc24365)](#_Toc24365)

# 

# **CHAPTER ONE(INTRODUCTION)**

## **1.1 Background of The Study**

The global trend in educational institutions is moving toward smart
campuses and digital transformation, with universities increasingly
adopting digital solutions to enhance operational efficiency and service
delivery. This shift is part of a broader movement toward smart
education environments that leverage technology to improve various
aspects of campus life (Hwang, 2014). The integration of digital systems
has become essential for modern universities seeking to optimize
resource management and provide enhanced services to students, staff,
and other individuals.

University fitness centres play a very crucial role in promoting student
wellness, mental health stability, and physical fitness. Research
indicates that students who regularly use campus recreational facilities
demonstrate lower levels of depressive symptoms and report higher
overall well-being (George Mason University, 2018). Efficient management
of these facilities is crucial to maximize their benefits to the users,
as well-organized wellness programs that include fitness centers have
been shown to significantly contribute to student success by helping
manage stress and build resilience (Mantra Health, 2021). The proper
management of these resources ensures that students can fully utilize
these facilities for their development and the business runs properly.

At the Babcock University Fitness Centre, the current gym access
procedure requires students to appear physically at the facility and
make direct payments to attendants before entry is granted. This system
is heavily reliant on human memory and manual confirmation, which often
leads to instances of payment disputes, forgotten transactions, delays
in entry, and poor tracking of gym attendance records. Furthermore, the
absence of a digital trainer booking and session scheduling system
contributes to operational inefficiencies and limits gym members'
ability to proactively plan their fitness routines with coaches.

Globally, automated gym management systems have been adopted in
professional fitness centres. These systems enhance operational
transparency, reduce human errors, improve the overall user experience
and ensure predictable business operation. However, such modern
automation is not yet implemented at the Babcock University Fitness
Centre.

To address these challenges, the study proposes the development of a
Smart Gym and Access Management System, a web-based application designed
to automate payment verification, support both subscription-based and
pay-per-use access models, implement structured trainer scheduling, and
provide QR code-based attendance logging. This system aims to provide a
seamless, efficient, and accountable approach to gym facility management
in alignment with global smart campus standards.

## **1.2 Problem Statement** 

The current operational model of the Babcock University Fitness Centre
is entirely manual, leading to numerous inefficiencies that affect both
users and administrators. Gym members are required to physically make
payments to gym attendants before access is granted, a method that is
prone to payment mismanagement, delayed verification, and lack of
digital accountability. In many cases, students have reported situations
where their payment is forgotten or not properly recorded, leading to
disputes and inconvenience.

From an administrative perspective, this is a nightmare in aiming for
operational efficiency, and profitability, the lack of centralized
digital records means there is no reliable insight into peak usage
periods, subscription tracking, or financial documentation. Furthermore,
training sessions are commonly arranged informally using messaging apps
or verbal agreements, which frequently leads to scheduling conflicts and
lack of oversight. The absence of a centralized scheduling mechanism
reduces service quality and complicates planning for both trainers and
gym members. Integrating a general trainer booking and scheduling module
into the proposed system will provide a reliable, auditable process for
scheduling, and enable better resource planning.

Therefore, there is a clear need for a smart, automated, and web-based
gym management system that eliminates these inefficiencies by
integrating automated payment verification, and trainer session
scheduling into a single intelligent platform for the Babcock University
Fitness Centre.

## **1.3 Aim and Specific Objectives**

The main aim of this study is to design and develop a web-based Smart
Gym Management System for Babcock University that automates payment
processing, gym access, and trainer scheduling.The specific objectives
are to:

i.  To develop a secure user authentication and role-based access
    control system for customers, trainers, and administrators.

ii. To integrate a reliable simulated payment gateway to facilitate
    online subscription and pay-per-use payments.

iii. To implement a time-limited QR codes with verification mechanisms
     to prevent casual sharing.

iv. To design and develop an appointment scheduling module for customers
    to book training sessions with trainers.

v.  To create an administrative dashboard for monitoring user activity,
    payment records, attendance analytics, and trainer schedules.

vi. To implement a personal workout logging module that allows members
    to track and review their individual fitness routines and progress.

## **1.4 Methodology Overview**

The system development will follow a structured software development
lifecycle to ensure alignment with user requirements. The methodology
will consist of the following key phases:

i.  Requirements Gathering: Conduct interviews with gym staff and
    students to identify functional and non-functional requirements.
    This phase will involve direct engagement with stakeholders to
    understand their needs and expectations for the system.

ii. System Design: Create use case diagrams, database schemas (ERD), and
    system architecture diagrams. The design phase will define the
    system structure, user interactions, and data management approach
    following software engineering best practices (Sommerville, 2015).

iii. Implementation: Implementation: Develop the system using a modern
     frontend stack (React, Tailwind, Vite, Shadcn, TypeScript)
     integrated with Firebase for serverless backend operations. The
     system will utilize payment simulations for initial testing and
     demonstration, with the intention of integrating the Paystack API
     for live financial transactions in future iterations. This modern
     web development stack will ensure the creation of a robust,
     scalable, and maintainable application.

iv. Testing: Unit testing, integration testing, and User Acceptance
    Testing (UAT) will be conducted to ensure functionality. The testing
    phase will verify that all system components work correctly together
    and meet user expectations.

v.  Deployment & Evaluation: The system will be deployed on a live
    server, and feedback will be gathered for future improvement. This
    final phase will involve implementing the system in a real-world
    environment and assessing its performance and user satisfaction.

## **1.5 Scope and Limitations of the Study**

This study focuses on the design and development of a Smart Gym
Management System for the Babcock University Fitness Centre. The system
will operate entirely through a web interface accessible via computers
and mobile browsers. Its core components include user authentication,
online payments, QR-code attendance logging, trainer scheduling,
personal workout tracking, and an administrative dashboard. These
features collectively address the key operational inefficiencies of the
current manual process.

The project deliberately excludes certain components to keep development
achievable within the needed timeline. No mobile-app version, biometric
or facial verification, IoT integration, equipment booking, or group
training functionality will be implemented. The web-based approach was
chosen to ensure easy accessibility without requiring installation or
additional hardware.

**Delimitations**

These are boundaries defined by the research team to maintain focus and
feasibility:

i.  Development limited to a web-based platform only.

ii. Excludes equipment booking and IoT monitoring features.

iii. The system will not integrate with other university databases or
     portals.

iv. The system uses a simulated payment environment to process
    membership subscriptions; integration with live financial payment
    gateways (such as Paystack) is explicitly excluded from this current
    scope to maintain focus on core system logic and avoid handling real
    financial data during the testing phase.

**Limitations**

These are factors beyond the research team's direct control:

i.  The system depends on stable internet connectivity for real-time
    transactions and QR validation.

ii. The QR-code security model minimizes, but cannot entirely prevent,
    code sharing or misuse.

iii. Testing and evaluation will occur only within the Babcock
     University Fitness Centre, which may restrict generalization to
     other institutions.

In summary, the defined scope ensures that the Smart Gym Management
System remains practical, implementable, and directly relevant to
Babcock University's fitness-centre operations. The delimitations and
limitations clarify the project's realistic boundaries while maintaining
its academic and practical significance.

## **1.6 Significance of the Study**

i.  For Gym Members: Provides a convenient, transparent, and cashless
    method for gym access and trainer booking. The system eliminates the
    need for physical payment verification, fragile mental workout
    logging and enables students to easily schedule training sessions,
    enhancing their overall fitness experience and encouraging
    consistent gym attendance.

ii. For Gym Administrators: Automates payment tracking and attendance
    logging, reducing errors and providing valuable usage analytics. The
    digital system minimizes manual record-keeping tasks and provides
    insights into gym utilization patterns, enabling more effective
    facility management and resource allocation.

iii. For Academic Research: Serves as a reference model for implementing
     practical, web-based management systems in an academic context. The
     project contributes to the body of knowledge on smart campus
     implementations and provides a foundation for future research on
     digital transformation in university facility management.

iv. For the University: Implementing a web-based gym management system
    directly contributes to the institution's progression towards a
    "smart campus" model, where physical infrastructure and student
    services are seamlessly integrated through digital technologies. By
    digitizing gym access, payments, attendance logging, and trainer
    coordination within a unified portal, Babcock University signals its
    commitment to leveraging technology not just for academic
    instruction but for campus-wide student wellness and facility
    management.

## 

## **1.7 Definition of Terms**

i.  Smart Gym Management System: A web-based platform designed to
    automate gym operations such as payment verification, attendance
    logging, and trainer scheduling. This system represents a
    technological solution to manual operational challenges in fitness
    facility management.

ii. Smart Campus: A technology-driven university ecosystem where digital
    systems and data are used to optimize campus services, improve
    resource management, and enhance student engagement and well-being
    (Polin, Yigitcanlar, Limb, & Washington, 2023).

iii. QR Code (Quick Response Code): A machine-readable code that stores
     information, used in this system for verifying user payment status
     and logging attendance. QR codes provide a efficient method for
     digital verification and data capture in the gym access process.

iv. Simulated Payment Gateway : A mock transaction processing
    environment integrated into the system for demonstration and testing
    purposes. It replicates the complete user flow of a real financial
    transaction, such as verifying test credentials, and activating
    subscriptions, without processing actual currency or requiring real
    banking details.

v.  Administrative Dashboard: A centralized web interface that allows
    administrators to view system analytics, manage users, and monitor
    transactions. This component provides comprehensive oversight of gym
    operations and usage patterns.

vi. Role-Based Access Control (RBAC): A security paradigm that restricts
    system access to users based on their roles (e.g., Member, Trainer,
    Admin). This approach ensures appropriate access privileges for
    different user types and maintains system security.

# 

# 

# 

# **CHAPTER TWO (LITERATURE REVIEW)**

## **2.1 Background of the Research**

Universities and fitness facilities have undergone a significant
evolution from manual, paper-based models of operation to more
integrated, digital ecosystems. In earlier decades, gyms and university
recreational centres relied almost entirely on physical ledgers, cash
payments, and face-to-face booking systems, all of which posed
challenges in terms of record-keeping, transparency, and scalability.

As information and communication technologies matured, fitness-centre
operations began embracing digital management systems. For example,
web-based gym management platforms using relational databases and
membership automation emerged, aiming to reduce manual workload,
minimise human error, and provide more reliable service delivery (Gamage
et al., 2022). Concurrently, the higher-education sector started
shifting toward what is called the "smart campus" model, where digital
infrastructure, analytics, and automation are leveraged to enhance
operational effectiveness, student experience, and campus services.

In the context of Nigerian universities, the adoption of smart-campus
strategies is still emerging, with many institutions managing sports and
wellness services in largely manual or semi-automated ways. This
presents both an opportunity and a challenge: while the technology is
available, infrastructural constraints, human-resource readiness and
legacy practices often impede full digital transition. Against this
backdrop, the management of campus fitness centres represents a
promising domain for digital experimentation. Integrating digital
payment systems, online membership verification, QR code attendance
logging, trainer scheduling, and administrative analytics can contribute
to the broader smart-campus agenda by improving student wellness
services, operational transparency and data-driven decision-making.

## **2.2 Overview of Existing System**

The current operational structure of the Babcock University Fitness
Centre is entirely manual, characterized by informal processes and
minimal record-keeping. Membership registration and payments are
conducted in person through gym attendants stationed at the facility.
Individuals who wish to access the gym either pay a one-time fee or
subscribe for a specified period, but all payments are made manually in
cash or via personal transfers to the attendants. These transactions are
seldom recorded in any centralized register or digital database;
instead, attendants rely largely on memory to identify those who have
paid and those who have not. Consequently, verification of payment and
membership status depends on personal recollection rather than an
objective or verifiable system of record.

This approach creates multiple operational and administrative
weaknesses. Firstly, it exposes the system to a high risk of human
error, miscommunication, and potential financial mismanagement. Disputes
occasionally arise when a gym members' payment is not remembered or
properly acknowledged, leading to unnecessary conflict and
inconvenience. Secondly, there is no systematic way to monitor facility
utilization, attendance frequency, or the validity period of
memberships. The absence of a database means that administrators cannot
generate usage statistics or evaluate the gym's performance over time,
thereby hindering informed decision-making and resource planning.

Moreover, trainer--trainee coordination within the centre is equally
informal. Training sessions are typically arranged verbally or through
personal messaging applications such as WhatsApp, without any
centralized record of scheduling, trainer availability, or session
history. This often results in uneven workload distribution among
trainers and scheduling overlaps, which diminish the overall quality of
service delivery.

Overall, while the existing system allows for basic day-to-day
operation, it falls significantly short of modern standards of
efficiency, transparency, and accountability expected within a
smart-campus framework. The lack of automation, data recording, and
analytical capacity highlights the pressing need for a web-based
management platform that can consolidate payment verification,
attendance logging, and trainer scheduling into a single digital
ecosystem.

## **2.3 Review of Related Work** 

Table 2.1[]{#_Toc24365 .anchor}: Summary of Reviewed Literature

+:--------+:----------------+:---------------+:---------+:----------------------+:---------------------+
| **S/N** | **Author(s)**   | **Title**      | **Year** | **Summary of works**  | **Gaps Identified**  |
+---------+-----------------+----------------+----------+-----------------------+----------------------+
| 1\.     | Polin,          | The Making of  | 2023     | Systematic review and | High-level and       |
|         | Yigitcanlar,    | Smart Campus:  |          | conceptual framework  | conceptual; does not |
|         | Limb &          | A Review and   |          | describing smart      | provide              |
|         | Washington      | Conceptual     |          | campus elements (IoT, | implementation       |
|         |                 | Framework      |          | analytics, services   | details for specific |
|         |                 |                |          | integration) and      | campus services such |
|         |                 |                |          | indicators for campus | as gym management or |
|         |                 |                |          | "smartness." Provides | QR-based attendance. |
|         |                 |                |          | a high-level          | Use as               |
|         |                 |                |          | justification for     | policy/context       |
|         |                 |                |          | integrating           | rather than a        |
|         |                 |                |          | administrative and    | technical blueprint. |
|         |                 |                |          | student services into |                      |
|         |                 |                |          | a unified digital     |                      |
|         |                 |                |          | platform.             |                      |
+---------+-----------------+----------------+----------+-----------------------+----------------------+
| 2\.     | K. Gamage (UCSC | Web Based Gym  | 2017     | Undergraduate thesis  | Academic/educational |
|         | thesis)         | Management     |          | describing a          | thesis-level work,   |
|         |                 | System         |          | web-based gym         | its useful for       |
|         |                 |                |          | management system     | gaining insight on   |
|         |                 |                |          | with modules for      | architecture         |
|         |                 |                |          | member/trainer/admin  | patterns but lacks   |
|         |                 |                |          | logins, membership    | modern features such |
|         |                 |                |          | handling and basic    | as integrated online |
|         |                 |                |          | reporting.It includes | payments, QR         |
|         |                 |                |          | architecture and      | attendance, and      |
|         |                 |                |          | implementation notes  | analytics            |
|         |                 |                |          | and is a practical    | dashboards.          |
|         |                 |                |          | template for B/S      |                      |
|         |                 |                |          | systems.              |                      |
+---------+-----------------+----------------+----------+-----------------------+----------------------+
| 3\.     | Pak             | Residential    | 2021     | The implementation    | Focus is residential |
|         | Satanasaowapak, | access control |          | focused on            | and IoT-enabled;     |
|         | Witawat         | system using   |          | residential security  | assumes hardware     |
|         | Kawseewai,      | QR code and    |          | with IoT integration, | sensors and          |
|         | Suchada         | the IoT (PDF)  |          | the core              | device-level         |
|         | Promlee, Anuwat |                |          | authentication        | integration not      |
|         | Vilamat         |                |          | methodology validates | feasible in a        |
|         |                 |                |          | the technical         | web-only campus      |
|         |                 |                |          | feasibility of        | deployment.          |
|         |                 |                |          | QR-based access       |                      |
|         |                 |                |          | systems. This         |                      |
|         |                 |                |          | research provides     |                      |
|         |                 |                |          | evidence that QR      |                      |
|         |                 |                |          | codes can be          |                      |
|         |                 |                |          | implemented with      |                      |
|         |                 |                |          | robust security       |                      |
|         |                 |                |          | measures, addressing  |                      |
|         |                 |                |          | potential concerns    |                      |
|         |                 |                |          | about the             |                      |
|         |                 |                |          | technology\'s         |                      |
|         |                 |                |          | vulnerability in      |                      |
|         |                 |                |          | access control        |                      |
|         |                 |                |          | applications.         |                      |
+---------+-----------------+----------------+----------+-----------------------+----------------------+
| 4\.     | Marjun Cinco    | Development of | 2025     | Implementation paper  | While their solution |
|         | Villanueva,     | Olympic        |          | describing a gym      | was effective for a  |
|         | Syndee Ann S.   | Fitness Gym    |          | management web system | commercial gym       |
|         | Sevilla, Rommel | Management     |          | that incorporates QR  | context, it lacked   |
|         | L. Verecio      | System with    |          | code check-in,        | integrated payment   |
|         |                 | integrated QR  |          | membership management | processing and was   |
|         |                 | Code           |          | and booking. Includes | not tailored for     |
|         |                 | technology     |          | deployment notes and  | university settings. |
|         |                 |                |          | lessons learned from  | This research        |
|         |                 |                |          | practical rollout.    | validates the        |
|         |                 |                |          |                       | technical            |
|         |                 |                |          |                       | feasibility of       |
|         |                 |                |          |                       | QR-based gym access  |
|         |                 |                |          |                       | systems but          |
|         |                 |                |          |                       | highlights the need  |
|         |                 |                |          |                       | for solutions        |
|         |                 |                |          |                       | specifically         |
|         |                 |                |          |                       | designed for         |
|         |                 |                |          |                       | educational          |
|         |                 |                |          |                       | institutions like    |
|         |                 |                |          |                       | Babcock University.  |
+---------+-----------------+----------------+----------+-----------------------+----------------------+
| 5\.     | Jude Alphonsus  | Development of | 2025     | The implementation    | It is exam-focused,  |
|         | Inyangetoh,     | QR Code-Based  |          | focused on a Nigerian | requires mobile app  |
|         | Ekemini Anietie | Authentication |          | educational QR system | and complex for      |
|         | Johnson         | System for     |          | with AES encryption,  | simple gym access    |
|         |                 | Examination    |          | proven in real        |                      |
|         |                 | Admission      |          | deployment, reduced   |                      |
|         |                 |                |          | verification time.    |                      |
+---------+-----------------+----------------+----------+-----------------------+----------------------+
| 6\.     | M. Adedoyin and | Development of | 2024     | It demonstrates       | It requires hardware |
|         | F. Olukoya      | a Smart Lock   |          | QR-driven access      | components, too      |
|         |                 | System using   |          | control for locked    | complex for simple   |
|         |                 | QR Code        |          | facilities; useful    | gym access, physical |
|         |                 | (AJERD)        |          | for understanding QR  | lock focus           |
|         |                 |                |          | generation/validation |                      |
|         |                 |                |          | and low-cost          |                      |
|         |                 |                |          | deployment for        |                      |
|         |                 |                |          | physical access.      |                      |
+---------+-----------------+----------------+----------+-----------------------+----------------------+
| 7\.     | Mohamed Shak    | Visitor        | 2025     | This study engineered | Designed for         |
|         | Mohaideen J,    | management     |          | a comprehensive       | managing one-time    |
|         | Vinu, Visagar   | system with QR |          | visitor management    | visitors, it lacks   |
|         | M, Arjun S      | code-based     |          | system using a        | features for         |
|         |                 | check-in       |          | technology stack of   | membership           |
|         |                 |                |          | PHP, MySQL, and       | subscriptions and    |
|         |                 |                |          | JavaScript to replace | recurring payment    |
|         |                 |                |          | manual sign-in        | integration.         |
|         |                 |                |          | processes. It         |                      |
|         |                 |                |          | features              |                      |
|         |                 |                |          | pre-registration,     |                      |
|         |                 |                |          | dynamic QR code       |                      |
|         |                 |                |          | generation, real-time |                      |
|         |                 |                |          | host notifications,   |                      |
|         |                 |                |          | and very detailed     |                      |
|         |                 |                |          | analytics for         |                      |
|         |                 |                |          | tracking visitor      |                      |
|         |                 |                |          | flow.                 |                      |
+---------+-----------------+----------------+----------+-----------------------+----------------------+
| 8\.     | Anees Abu       | Smart          | 2025     | This study developed  | The system relies on |
|         | Sneineh, Wael   | Attendance     |          | a hardware-based      | specialized          |
|         | A. Salah        | System for     |          | attendance system     | electronic hardware, |
|         |                 | University     |          | using a PIC           | making it less       |
|         |                 | Students Based |          | microcontroller and a | practical and        |
|         |                 | on QR Code     |          | QR reader to automate | scalable for a       |
|         |                 |                |          | student attendance    | software-based gym   |
|         |                 |                |          | tracking, reporting   | access system that   |
|         |                 |                |          | satisfactory          | needs to run on      |
|         |                 |                |          | operation with        | standard computers   |
|         |                 |                |          | reduced time and      | or mobile devices.   |
|         |                 |                |          | errors.               |                      |
+---------+-----------------+----------------+----------+-----------------------+----------------------+
| 9\.     | Axel Seeth      | Balancing      | 2024     | This thesis developed | The research is      |
|         |                 | Security and   |          | a secure and          | narrowly focused on  |
|         |                 | Efficiency in  |          | power-efficient QR    | battery-operated,    |
|         |                 |                |          | code authentication   | hardware-specific    |
|         |                 | Isolated QR    |          | framework for digital | systems for real     |
|         |                 | Code-Based     |          | property systems,     | estate, making its   |
|         |                 |                |          | utilizing threat      | complex security     |
|         |                 | Authentication |          | modeling and a Proof  | model and            |
|         |                 | Systems in     |          | of Concept to balance | power-efficiency     |
|         |                 | Real Estate    |          | high-level security   | trade-offs less      |
|         |                 |                |          | with hardware         | relevant for a       |
|         |                 |                |          | constraints.          | standard web-based   |
|         |                 |                |          |                       | gym management       |
|         |                 |                |          |                       | system.              |
+---------+-----------------+----------------+----------+-----------------------+----------------------+
| 10\.    | Ali Hasan,      | A Full-Stack   | 2025     | This study presents a | While highly         |
|         | Nihal Patel,    | Gym Management |          | full-stack Gym        | relevant, the system |
|         | Mohsin Hasan    | System for     |          | Management System     | does not implement   |
|         |                 | Fitness        |          | using the MERN stack, | QR code technology   |
|         |                 | Centers Using  |          | integrating modules   | for access control   |
|         |                 | MERN           |          | for membership        | and focuses on       |
|         |                 |                |          | management, workout   | general management   |
|         |                 | Architecture   |          | planning, and         | features rather than |
|         |                 |                |          | progress tracking to  | solving the specific |
|         |                 |                |          | enhance               | manual payment and   |
|         |                 |                |          | administrative        | attendance problems  |
|         |                 |                |          | efficiency and user   | seen at Babcock      |
|         |                 |                |          | engagement.           | University.          |
+---------+-----------------+----------------+----------+-----------------------+----------------------+
| 11\.    | Atharva Pujari, | Exploring the  | 2025     | This paper provides a | As a general         |
|         | Rashid Patel    | MERN Stack: An |          | comprehensive         | technology review    |
|         |                 | In-Depth       |          | analysis of the MERN  | paper, it does not   |
|         |                 | Analysis       |          | stack, highlighting   | address the specific |
|         |                 |                |          | its advantages in     | domain of gym        |
|         |                 | of Full-Stack  |          | scalability,          | management systems   |
|         |                 | JavaScript     |          | flexibility, and      | or provide solutions |
|         |                 | Development    |          | unified JavaScript    | for the operational  |
|         |                 | for Scalable   |          | development for       | challenges faced by  |
|         |                 |                |          | building modern web   | university fitness   |
|         |                 | and Efficient  |          | applications,         | centers.             |
|         |                 | Web            |          | supported by case     |                      |
|         |                 | Applications   |          | studies.              |                      |
+---------+-----------------+----------------+----------+-----------------------+----------------------+
| 12\.    | Badriah, N., &  | Optimization   | 2024     | This paper describes  | While sufficient for |
|         | Shandy, S. V.   | of Gym         |          | a practical           | a small commercial   |
|         |                 | Check-In and   |          | implementation of a   | fitness center, the  |
|         |                 | Membership     |          | QR code-based gym     | system does not      |
|         |                 | Information    |          | check-in system at a  | address integration  |
|         |                 | System: QR     |          | fitness center in     | with online payment  |
|         |                 | Code Scanner   |          | Indonesia. The system | systems or           |
|         |                 | Based          |          | improved attendance   | university-specific  |
|         |                 |                |          | tracking efficiency   | requirements such as |
|         |                 |                |          | and reduced manual    | role-based access or |
|         |                 |                |          | errors, while also    | training session     |
|         |                 |                |          | allowing gym managers | scheduling.          |
|         |                 |                |          | to generate detailed  |                      |
|         |                 |                |          | attendance reports.   |                      |
+---------+-----------------+----------------+----------+-----------------------+----------------------+

## **2.4 Potential Challenges in System Implementation**

The successful implementation of the proposed Smart Gym Management
System at Babcock University is contingent upon overcoming several
potential challenges. A proactive identification of these hurdles is
essential for developing effective mitigation strategies and ensuring
the system\'s long-term viability.

1.  **Technical Infrastructure and Connectivity Dependencies:**

The core functionality of the system, including QR code authentication,
and live dashboard updates, is heavily dependent on a stable and robust
internet connection. Inconsistent network performance, a common
challenge in the Babcock University environments, could lead to
transaction failures, delayed access for students, and synchronization
errors in attendance records. Furthermore, the system\'s requirement for
devices (e.g., a dedicated smartphone or tablet for scanning QR codes)
and a secure, always-on server introduces both hardware and hosting
considerations that must be addressed to prevent operational downtime.

2.  **User Adoption and Behavioral Resistance:**

A significant challenge lies in transitioning all stakeholders from the
familiar manual process to the new digital system. Traditionalist gym
members may be hesitant to adopt the new process due to a perceived
complexity, or simply resistance to change. Similarly, gym staff and
administrators who are accustomed to the existing manual methods may be
reluctant to trust the automated system, potentially leading to a period
of parallel operation (running both systems at once) which would
increase the workload rather than reduce it. Ensuring the system is
intuitive and providing adequate training is crucial to overcoming this
inertia.

3.  **Data Security and Privacy Concerns:**

The system will handle sensitive student data, including personal
identification details and financial transaction information from
payment processing. This makes it a potential target for cyber threats,
such as data breaches or unauthorized access. Ensuring robust security
measures, including secure encryption for data transmission and storage,
strict role-based access controls for the admin dashboard, and
compliance with data protection regulations, is paramount to maintaining
user trust and institutional integrity.

4.  **Financial and Operational Integration Hurdles:**

Integrating a payment gateway, while a core feature, introduces a
dependency on a third-party service and associated transaction fees that
must be accounted for in the gym\'s financial model. From an operational
perspective, defining clear procedures for edge cases is critical. For
instance, protocols are needed for scenarios where a student has made a
digital payment but their QR code fails to scan due to a technical
fault, or when a payment is disputed. The lack of a direct link to the
university\'s central student database may also necessitate manual user
registration, creating an initial data entry burden and potential for
duplication.

5.  **Physical Enforcement and System Integrity:**

The QR code system digitally verifies payment and logs attendance, but
it cannot physically prevent a person from entering the gym. This
creates a potential gap that requires a minimal level of human
oversight. The system relies on gym attendants to ensure that the
scanning process is followed correctly and to handle situations where
students may attempt to bypass the digital check-in. This highlights
that the system is designed to aid management, not entirely replace
human supervision.

## **2.5 Summary of Literature Review and Research Gap**

This comprehensive review substantiates the necessity and feasibility of
the proposed Smart Gym Management System. The analysis reveals a clear
disconnect between the global shift towards smart campus infrastructure
and the persistent use of manual, inefficient operations at the Babcock
University Fitness Centre. The existing system\'s vulnerabilities
including financial discrepancies, lack of reliable data, and
disorganized scheduling, which creates a compelling case for a digital
intervention.

Critically, the review of related works demonstrates that the
technological components for a solution are readily available and
well-documented. Research validates the effectiveness of web-based
management systems and the efficiency of QR codes for secure access
control. However, a significant gap exists in the literature: no
solution integrates these elements into a unified platform specifically
designed for the unique environment of a Nigerian university gym. Most
existing systems we found are either too generic, commercially focused,
or reliant on complex hardware, making them unsuitable for Babcock\'s
specific context.

The proposed study does not aim to pioneer new algorithms or hardware.
Instead, its primary contribution lies in the integration and tailoring
of established technologies into a purpose-built system. By developing a
web-based platform that seamlessly combines digital payments, QR-code
authentication, and trainer scheduling, this research will deliver a
targeted solution that directly bridges the identified technological
gap. It offers a practical model for modernizing campus recreational
facilities, enhancing operational transparency, and improving the user
experience for both students and administrators at Babcock University.

# **CHAPTER THREE (SYSTEM ANALYSIS AND DESIGN)**

## **3.1 System Analysis and Methodology Overview**

This chapter presents the technical design and development approach
adopted in the implementation of the Smart Gym Management System for the
Babcock University Fitness Centre. It details the system's architecture,
requirements, design models, and development tools. The objective of
this chapter is to translate the identified problems and objectives from
the previous chapters into a practical and implementable system
framework. The analysis and design processes are structured to ensure
functionality, security, and scalability while maintaining a
user-friendly interface suitable for students, trainers, and
administrators.

## **3.2 Overview of the Proposed System**

The proposed Smart Gym Management System is a web-based application
developed to automate and manage gym operations at the Babcock
University Fitness Centre. The system seeks to eliminate inefficiencies
associated with the current manual process by integrating secure user
authentication, online payment processing, QR code-based attendance
logging, and trainer appointment scheduling within a single platform.

The system provides role-based access:

i.  Gym members can register, make payments (either subscription-based
    or pay-per-session), generate QR codes for entry, schedule training
    sessions with available trainers, and log personal workout data.

ii. Trainers can create and manage time slots for sessions, accept or
    cancel bookings, and track their session schedules.

iii. Administrators can monitor overall system activities, including
     payment records, attendance logs, and trainer utilization analytics
     through a centralized dashboard.

The proposed solution aims to improve accountability, operational
efficiency, and user convenience while aligning with Babcock
University's vision for digital transformation within its campus
facilities.

## **3.3 System Requirements Specification**

**Functional Requirements**

Functional requirements define the specific behaviors, functions, and
capabilities that the system must provide to meet user needs and
business objectives. The functional requirements for the Smart Gym
Management System are organized by user role and system module.

FR1: The system shall allow new users to register by providing their
name, email address, password, and user type (Member or Trainer).

FR2: The system shall authenticate registered users through email and
password credentials.

FR3: The system shall restrict access to features based on user roles
(Member, Trainer, Administrator).

FR4: The system shall allow users to log out of their accounts securely.

FR5: The system shall allow members to select between monthly
subscription and pay-per-session payment options.

FR6: The system shall simulate a payment gateway that processes online
payments securely.

FR7: The system shall allow members to view their payment history.

FR8: The system shall generate a unique QR code for each member upon
successful payment.

FR9: The system shall encode user identification, date, and validation
information within the QR code.

FR10: The system shall allow gym attendants to scan QR codes to verify
payment status.

FR11: The system shall log attendance records with date and timestamp
when a QR code is successfully scanned.

FR12: The system shall reject QR codes that have expired based on the
payment type.

FR13: The system shall allow trainers to set their activity status
(active or inactive).

FR14: The system shall allow members to book general training sessions
with available trainers.

FR15: The system shall allow multiple members to book the same trainer
for a given time slot without locking the availability.

FR16: The system shall allow members and trainers to cancel scheduled
appointments.

FR17: The system shall provide administrators with a dashboard
displaying user statistics, payment summaries, and attendance data.

FR18: The system shall allow administrators to view all registered users
and their subscription status.

FR19: The system shall allow members to create and save personal workout
logs, including details such as exercise type, duration, or repetitions.

**Non-Functional Requirements**

Non-functional requirements specify the quality attributes and
constraints that the system must satisfy. These requirements define how
the system performs its functions rather than what functions it
performs.

NFR1: The system shall utilize Firebase Authentication to securely
manage user credentials and password hashing.

NFR2: The system shall transmit all data between client and server using
HTTPS protocol.

NFR3: The system shall validate and sanitize all user inputs to validate
and sanitize all user inputs to prevent injection attacks (including
NoSQL injection where applicable) and cross-site scripting (XSS).

NFR4: The system shall implement secure session management utilizing
Firebase Authentication\'s native token system.

NFR5: The system shall implement rate limiting on authentication
endpoints to prevent brute force attacks.

NFR6: The system shall provide clear feedback messages for user actions,
including success confirmations and error descriptions.

NFR7: The system shall be accessible through modern web browsers
including Chrome, Firefox, Safari, and Edge.

NFR8: The system interface shall be responsive and functional on both
desktop computers and mobile devices.

NFR9: The system shall use intuitive navigation and labeling that
requires minimal training for basic operations.

NFR10: The system shall implement error handling mechanisms to provide
informative error messages when operations fail.

NFR11: The system shall log critical errors with timestamps to support
troubleshooting and system maintenance.

NFR12: The system codebase shall follow consistent naming conventions
and include comments for complex logic sections.

NFR13: The system shall employ a modular architecture that separates
concerns between frontend presentation, backend business logic, and
database operations.

## **3.4 System Architecture Overview**

The Smart Gym Management System follows a three-tier client--server
architecture, consisting of the following major components:

1.  Presentation Layer (Frontend): Built using React, Vite, TypeScript,
    Shadcn, and Tailwind CSS, this layer provides a highly responsive
    and interactive user interface for students, trainers, and
    administrators.

2.  Application & Data Layer (Firebase): Instead of a traditional custom
    server, business logic and data storage are handled securely via
    Firebase.

3.  Firebase Authentication: Manages user sign-ups, logins, and secure
    session states.

4.  Cloud Firestore: A flexible, scalable NoSQL cloud database that
    stores user profiles, payment history, attendance logs, workout
    logs, and scheduling data in real-time.\"

    ![Untitled
    diagram-2026-03-26-113204](media/image2.png){width="6.0881944444444445in"
    height="4.096527777777778in"}

**Figure 3.1**[]{#_Toc21408 .anchor}**: System Architecture Model**

## **3.5 Process Models**

The development process for this project adopts the Incremental Model, a
variant of the Software Development Life Cycle (SDLC) that combines
iterative development with phased delivery.

Each increment adds a functional component, allowing continuous testing
and feedback before integrating the next. This approach ensures that
core modules (authentication, payments, QR attendance, scheduling, and
analytics) are developed, tested, and refined sequentially.

**Phases of the Incremental Model**

1.  Requirement Analysis: Define all system features through stakeholder
    consultation and research.

2.  System and Software Design: Create architecture diagrams, database
    schemas, and user interfaces.

3.  Implementation: Develop modules incrementally using React and
    Firebase components.

4.  Testing: Perform unit, integration, and user acceptance testing
    after each increment.

5.  Deployment and Evaluation: Deploy the final system on a live web
    server for user feedback and optimization.

This model supports flexibility and risk mitigation by ensuring that
early deliverables are functional and testable while subsequent
increments build on validated foundations.

![](media/image3.png){width="4.9125in" height="2.475in"}

**Figure 3.2**[]{#_Toc15274 .anchor}**: System Incremental Process
Model**

Note. From *Incremental model in software engineering*, by D. Sachan,
2025, Scaler Topics.

## **3.6 Flowchart for User Log In**

Figure 3.3 illustrates the overall process flow. It outlines the key
interactions of users/students, trainers, and administrators with the
system, from account registration and payment processing to attendance
logging, session scheduling, and administrative monitoring.

![flowchat sgms](media/image4.png){width="3.8472222222222223in"
height="4.729166666666667in"}

**Figure 3.3**[]{#_Toc15953 .anchor}**: System Flowchart Model**

## **3.7 Use Case Diagram**

Figure 3.4 illustrates the primary actors and their interactions with
the Smart Gym Management System. It highlights the system's core
functionalities, emphasizing how gym members, trainers, and
administrators engage with various modules such as authentication,
payments, scheduling, and reporting.

![Use Case SGMS-Page-1](media/image5.png){width="6.094444444444444in"
height="3.283333333333333in"}

**Figure 3.4**[]{#_Toc24950 .anchor}**: System Use Case Diagram**

## **3.8 Sequence Diagrams**

Figures 3.5, 3.6, and 3.7 illustrate the major dynamic interactions
among users, the system, and external services within the Smart Gym
Management System. These include the processes for payment and QR
generation, QR validation at gym entry, and trainer scheduling. Each
diagram represents a specific user workflow and highlights how the
system components collaborate to achieve core objectives.

![Payment Sequence
Diagram](media/image6.png){width="6.092361111111111in"
height="6.309722222222222in"}

**Figure 3.5**[]{#_Toc21958 .anchor}**: System Payment Sequence
Diagram**

![Trainer Scheduling
Sequence](media/image7.png){width="6.091666666666667in"
height="8.53888888888889in"}

**Figure 3.6**[]{#_Toc19255 .anchor}**: System Trainer Scheduling
Sequence Diagram**

![QR Code Sequence](media/image8.png){width="6.095833333333333in"
height="7.145833333333333in"}

**Figure 3.7**[]{#_Toc23169 .anchor}**: System QR Code Validation
Sequence Diagram**

## **3.9 Class Diagram**

Figure 3.8 represents the static structure of the Smart Gym Management
System, illustrating the system's key classes, attributes, methods, and
their relationships. It models how users, payments, subscriptions, QR
codes, attendance records, and bookings are interconnected within the
software design.

![Class Diagram SGMS](media/image9.png){width="6.086805555555555in"
height="4.459722222222222in"}

**Figure 3.8**[]{#_Toc13093 .anchor}**: System Class Diagram**

## **3.10 Database Design**

The database design defines the logical structure of data storage and
relationships within the Smart Gym Management System. It establishes how
various entities including users, payments, subscriptions, QR codes,
attendance records, trainer slots, and bookings interact to support the
system's functional requirements. Figure 3.9 illustrates these entities,
their primary and foreign keys, and the cardinality of their
relationships. This structured data model ensures data integrity,
facilitates efficient querying, and supports seamless integration across
all system modules.

![ERD SGMS](media/image10.png){width="6.092361111111111in"
height="1.6965277777777779in"}

**Figure 3.9**[]{#_Toc31502 .anchor}**: System Entity Relationship
Diagram**

## 3.11 Development Tools and Frameworks

**Frontend Technologies**

1.  React (via Vite): A JavaScript library for building user interfaces.
    Vite is used as the build tool to provide a faster and leaner
    development experience.

2.  TypeScript: A strongly typed programming language that builds on
    JavaScript, ensuring better code reliability and fewer runtime
    errors.

3.  Tailwind CSS & Shadcn: Tailwind provides utility-first CSS for rapid
    UI styling, while Shadcn is used for highly customizable,
    accessible, and pre-built UI components.

**Backend & Database Technologies (Serverless)**

1.  Firebase Authentication: A backend service that provides secure,
    ready-to-use UI libraries and SDKs to authenticate users using
    passwords and tokens.

2.  Cloud Firestore: A flexible NoSQL cloud database provided by
    Firebase that stores and syncs data (like attendance, bookings, and
    payments) across users in real-time.

**External Services**

1.  Simulated Payment Gateway: (Keep your existing description here).

2.  QR Code Libraries: (Keep your existing description here).

# CHAPTER FOUR (SYSTEM IMPLEMENTATION)

## 4.1 Implementation Overview

This chapter explains how the smart gym access and management system was
built and how the different parts of the system were implemented based
on the designs in chapter 3. The detailed analysis and design done in
Chapter 3 to elicit the system requirements was modeled into the
implementation of the system. It also depicts the Graphical User
Interface (GUI) of the system through snapshots.

The fully implemented Smart Gym Management System has been successfully
deployed to a live server. The live application URL and test credentials
for assessment can be found in Appendix A.

## 4.2 Graphical User Interface of the Project

The Graphical User Interface of the proposed system refers to the visual
representation of the system that the users interact with. It is the
part they see and use to access the features of the system which include
generating a unique QR code for gym access, adding workout schedules,
and booking sessions with trainers. The design is simple and easy to
navigate. Administrators also have the ability to scan the QR codes of
the users to confirm their subscription status and give subscribed users
access to the gym facilities and services, they can also keep track of
important data for analysis.

**System Landing Page**

Figure 4.1 displays the landing page for the GymTrace platform. It
introduces the system\'s core features and includes a mobile device
mockup to demonstrate the application\'s responsive design. The
interface serves as a navigation hub, providing direct links and buttons
to route users to the registration and authentication portals.

![gymtrace.vercel.app\_](media/image11.png){width="6.095138888888889in"
height="3.9722222222222223in"}

**Figure 4.1**[]{#_Toc29642 .anchor}**: System Landing Page**

**User Registration Interface**

Figure 4.2 displays the User Registration interface for the GymTrace
platform. The form collects standard account credentials while featuring
a central toggle switch for users to define their role as either a
\"Member\" or a \"Trainer.\" This secure entry point ensures that once
an account is created, the system accurately assigns the necessary
permissions and routes the user to their specific, role-based dashboard.

![gymtrace.vercel.app_register](media/image12.png){width="5.701388888888889in"
height="3.7152777777777777in"}

**Figure 4.2**[]{#_Toc23270 .anchor}**: User Registration Interface**

**User Login Interface**

Figure 4.3 displays the secure User Login interface for the GymTrace
platform. The form prompts users for their registered email address and
password. Upon submission, the system authenticates the credentials
against the database and executes role-based routing, seamlessly
directing the user to either the Member or Trainer.

![gymtrace.vercel.app_login](media/image13.png){width="4.707638888888889in"
height="3.0652777777777778in"}

**Figure 4.3**[]{#_Toc26117 .anchor}**: User Login Interface**

1.  **Member Portal Interfaces**

The Member Portal serves as the primary interface for gym clients to
manage their fitness journey. Upon authentication, users view a central
dashboard that aggregates their active subscription status, wallet
balance, and recent attendance data. From this portal, members can
navigate to dedicated modules to book personal training sessions based
on specialty, track their lifetime facility attendance, and manage their
recurring payments or one-time passes. Additionally, the system includes
a comprehensive workout tracking interface where members can view daily
exercise plans and log custom routines. Facility access is facilitated
through a dynamic QR code generator available directly from the
navigation bar.

![gymtrace.vercel.app\_
(1)](media/image14.png){width="6.095138888888889in"
height="3.9722222222222223in"}

**Figure 4.4**[]{#_Toc21241 .anchor}**: Member Dashboard Interface**

![gymtrace.vercel.app_bookings](media/image15.png){width="6.095138888888889in"
height="3.9680555555555554in"}

**Figure 4.5**[]{#_Toc13139 .anchor}**: Trainer Booking Interface**

![gymtrace.vercel.app\_
(2)](media/image16.png){width="6.095138888888889in"
height="3.9722222222222223in"}

**Figure 4.6**[]{#_Toc27583 .anchor}**: Attendance History Interface**

![gymtrace.vercel.app_payments](media/image17.png){width="6.095138888888889in"
height="3.9027777777777777in"}

**Figure 4.7**[]{#_Toc15265 .anchor}**: Payment and Billing Interface**

![gymtrace.vercel.app_member_payments](media/image18.png){width="6.095138888888889in"
height="3.9722222222222223in"}

**Figure 4.8**[]{#_Toc30617 .anchor}**: Workout Tracking Interface**

2.  **Trainer Portal Interfaces**

The Member Portal serves as the primary interface for gym clients to
manage their fitness journey. Upon authentication, users are presented
with a central dashboard that aggregates their active subscription
status, wallet balance, and recent attendance data. From this portal,
members can navigate to dedicated modules to book personal training
sessions based on specialty, track their lifetime facility attendance,
and manage their recurring payments or one-time passes. Additionally,
the system includes a comprehensive workout tracking interface where
members can view daily exercise plans and log custom routines. Facility
access is facilitated through a dynamic QR code generator available
directly from the navigation bar.

![gymtrace.vercel.app_trainer_dashboard
(1)](media/image19.png){width="6.095138888888889in"
height="3.9722222222222223in"}

**Figure 4.9**[]{#_Toc9513 .anchor}**: Trainer Dashboard Interface**

![gymtrace.vercel.app_trainer_dashboard
(2)](media/image20.png){width="6.095138888888889in"
height="3.9722222222222223in"}

**Figure 4.10**[]{#_Toc8260 .anchor}**: Weekly Schedule Interface**

![sessions](media/image21.png){width="6.095138888888889in"
height="4.115277777777778in"}

**Figure 4.11**[]{#_Toc30894 .anchor}**: Sessions Interface**

3.  **Administrator Portal Interfaces**

The Administrator Portal equips system managers with the tools required
to oversee facility operations and user data. The overview dashboard
displays real-time metrics, including total registrations, active
personnel, and daily check-in volumes. A core operational feature is the
Check-in Scanner, which allows staff to process member entry via digital
QR codes or manual ID input. Administrators also have access to
comprehensive management directories for both members and trainers to
monitor account statuses. Furthermore, the portal includes an Analytics
module that utilizes data visualization to track system performance,
such as user registration growth over time.

![WhatsApp Image 2026-03-26 at 2.24.21
PM](media/image22.jpeg){width="1.59375in" height="3.5444444444444443in"}

**Figure 4.12**[]{#_Toc26669 .anchor}**: Admin Dashboard Interface**

![WhatsApp Image 2026-03-26 at 2.24.22
PM](media/image23.jpeg){width="1.7777777777777777in"
height="3.957638888888889in"}

**Figure 4.13**[]{#_Toc8277 .anchor}**: Check-in Scanner Interface**

![WhatsApp Image 2026-03-26 at 2.24.26
PM](media/image24.jpeg){width="1.9951388888888888in"
height="4.436805555555556in"}

**Figure 4.14**[]{#_Toc31355 .anchor}**: Trainer Management Interface**

![WhatsApp Image 2026-03-26 at 2.24.24
PM](media/image25.jpeg){width="1.8222222222222222in"
height="4.052083333333333in"}

**Figure 4.15**[]{#_Toc11994 .anchor}**: Member Management Interface**

![WhatsApp Image 2026-03-26 at 2.24.20
PM](media/image26.jpeg){width="2.045138888888889in"
height="4.545833333333333in"}

**Figure 4.16**[]{#_Toc3557 .anchor}**: Reports and Analytics
Interface**

## 4.3 Software Testing

System testing is a subset of software testing that assesses how well a
software system or application functions overall. System testing\'s
objective is to confirm that the software system is operating in
accordance with the stated requirements and beyond end-user
expectations.

System testing involves testing the complete system as a whole, which
includes confirming the functionality of each individual component and
making sure they are linked and functioning properly. The planned system
was tested to make sure it met the given requirements (functional and
non-functional).

**Black Box**

In testing this system, we shall incorporate the black box testing
technique. There shall be an evaluation of how the proposed system
functions without delving into its internal code structure. The aim is
to focus on the inputs and outputs of the system and show how intended
users interact with the system to meet their needs as expected. 

Below were the test cases treated in the testing of the system.

**TEST CASE 1 - Authentication & Security**

Users tested: Member and Trainer

Step 1

Test Description: Select user type, input valid personal details, email,
and password, then click register.

Expected Result: The system creates the account in the database,
triggers the native Firebase verification email template to the provided
address, and displays a prompt asking the user to check their inbox.

Result: SUCCESS

Step 2

Test Description: Attempt to log in immediately without clicking the
verification link in the email.

Expected Result: The system detects the unverified status, denies
dashboard access, and displays a message requiring the user to verify
their email first.

Result: SUCCESS

Step 3

Test Description: Open the Firebase-generated email and click the native
verification link.

Expected Result: The system validates the token, marks the email as
verified in the database, and redirects the user to the GymTrace login
page with a success message.

Result: SUCCESS

Step 4

Test Description: Input the verified email and the correct password,
then click log in.

Expected Result: The system validates the credentials against Firebase
Authentication, grants access, and redirects the user to their
respective Home Dashboard.

Result: SUCCESS

Step 5

Test Description: Attempt to log in using an unregistered email or the
wrong password.

Expected Result: The system denies access and displays an \"Invalid
credentials\" error message.

Result: SUCCESS

Step 6

Test Description: Click the \"Log out\" button from the user dashboard.

Expected Result: The system securely terminates the active
authentication session and redirects the user back to the system\'s
landing or login page.

Result: SUCCESS

**TEST CASE 2 - QR Code Verification & Check-in**

Users tested: Member and Admin

Step 1

Test Description: The member navigates to the QR generation section on
their dashboard to access the facility.

Expected Result: The system instantly generates and displays a unique,
time-sensitive QR code tied directly to that member\'s active account.

Result: SUCCESS

Step 2

Test Description: The admin points the Check-in Scanner interface camera
at the member\'s newly generated QR code.

Expected Result: The system reads the code, validates the member\'s
active subscription status, logs the current check-in timestamp to the
database, and displays a visual success confirmation for the admin.

Result: SUCCESS

Step 3

Test Description: The admin scans an expired QR code, such as a
screenshot taken from a previous day, or an unrecognizable QR code.

Expected Result: The system rejects the scan, prevents the attendance
log from being created, and displays an \"Invalid or Expired QR Code\"
error message on the admin\'s screen.

Result: SUCCESS

Step 4

Test Description: The admin bypasses the camera and types a valid Member
ID directly into the \"Manual Check-in\" text field, then clicks \"Check
In\".

Expected Result: The system successfully queries the database for that
specific ID, verifies the member, and manually logs the check-in
timestamp just as a successful scan would.

Result: SUCCESS

Step 5

Test Description: The admin types an incorrect or non-existent Member ID
into the manual entry field and submits.

Expected Result: The system denies the entry and displays a \"Member Not
Found\" or \"Invalid ID\" error message.

Result: SUCCESS

**TEST CASE 3 - Workout Tracking**

Users tested: Member

Step 1

Test Description: Navigate to the Workouts tab and click \"Log Custom
Workout\".

Expected Result: The system opens a data entry form prompting the user
for exercise name, sets, repetitions, and weight.

Result: SUCCESS

Step 2

Test Description: Fill out all required fields with valid numerical data
and submit the form.

Expected Result: The system saves the log to the database, adds it to
the day\'s exercise list, and updates the user\'s Weekly Goal progress
bar.

Result: SUCCESS

Step 3

Test Description: Attempt to submit the custom workout form while
leaving mandatory fields blank.

Expected Result: The system highlights the missing fields in red and
prevents the form from submitting until corrected.

Result: SUCCESS

**TEST CASE 4 - Trainer Schedule & Session Management**

Users tested: Trainer

Step 1

Test Description: Navigate to the Sessions tab, locate an upcoming
appointment, and click \"Mark Complete\".

Expected Result: The system changes the session status to \"Completed\"
and updates the corresponding client\'s record.

Result: SUCCESS

Step 2

Test Description: Locate an upcoming appointment and click the
\"Cancel\" action button.

Expected Result: The system removes the booking from the calendar, sends
an alert to the affected member, and refunds the session count to the
member\'s wallet.

Result: SUCCESS

**TEST CASE 7 - System Administration & Reports**

Users tested: Admin

Step 1

Test Description: Log in and navigate to the Admin Dashboard.

Expected Result: The system correctly aggregates and displays real-time
metrics for total bookings, active members, active trainers, and daily
check-ins.

Result: SUCCESS

Step 2

Test Description: Navigate to the Members management directory and click
on a specific user profile.

Expected Result: The system retrieves and displays the user\'s complete
account details, subscription status, and contact information.

Result: SUCCESS

Step 3

Test Description: Navigate to the Reports tab and select the \"User
Growth\" section.

Expected Result: The system queries the database and successfully
generates a bar chart visually displaying new member registrations over
the past six months.

Result: SUCCESS

# CHAPTER FIVE (CONCLUSION AND RECOMMENDATIONS)

## 5.1 Summary of the Study

The primary objective of this project was to design and implement a
comprehensive web-based facility and user management system, named
GymTrace, to address the inefficiencies associated with traditional,
manual gym administration. The developed system successfully integrates
multiple operational modules into a single platform. It provides a
secure environment using native Firebase email authentication, a
simulated payment gateway for subscription management, and a dynamic QR
code generator for seamless member check-ins. Additionally, the platform
facilitates interaction between fitness instructors and clients through
a dedicated booking system and allows members to track their custom
workout routines. By digitizing these processes, GymTrace minimizes
administrative overhead and enhances the overall user experience for gym
administrators, trainers, and members.

## 5.2 Conclusion

Based on the implementation and testing of the GymTrace system, it is
evident that transitioning from manual record-keeping to an automated
platform significantly improves operational efficiency. The integration
of real-time data synchronization ensures that administrators have
accurate insights into facility usage, active memberships, and trainer
schedules. The system successfully demonstrates that complex gym
operations, such as session tracking, billing history, and facility
access, can be effectively managed through an intuitive web interface.
In conclusion, this study establishes that GymTrace is a viable,
scalable, and secure solution that advances the administrative
capabilities of modern fitness centers.

## 5.3 Recommendations

Following the successful development and evaluation of the system, the
following recommendations are proposed:

First, it is recommended that local fitness centers adopt this system to
phase out paper-based administrative processes, which are prone to data
loss and human error. Second, facility administrators and staff should
undergo brief operational training to ensure they can efficiently
utilize the QR code scanner and analytics dashboards. Finally, gyms
should ensure they have stable internet connectivity and adequate
hardware, such as standard computer browsers or tablets, to maximize the
real-time capabilities of the application.

## 5.4 Future Directions

While the current iteration of GymTrace meets its core objectives,
several enhancements can be explored in future studies to further expand
its functionality. Future development could focus on replacing the
simulated payment gateway with a live financial processing API to handle
real monetary transactions. Additionally, integrating the platform with
wearable fitness technology, such as smartwatches and heart rate
monitors, to mention a few, would allow for automated biometric data
tracking during custom workouts. Finally, developing a dedicated native
mobile application for Android and iOS devices would provide members
with offline access to their workout histories and push notifications
for upcoming training sessions.

# REFERENCES

Hwang, G. J. (2014). Definition, framework and research issues of smart
learning environments-a context-aware ubiquitous learning
perspective.Smart Learning Environments, 1(1), 1-14.

George Mason University. (2018, October 25). College students who use
campus gyms have fewer depressive symptoms, study finds. George Mason
University News.
https://cehd.gmu.edu/features/2023/06/30/how-campus-wellness-centers-can-help-students-cope-with-stress/

Mantra Health. (2021). The importance of college wellness programs.
Mantra Health.

Sommerville, I. (2015). Software engineering (10th ed.). Pearson
Education.

Polin, K., Yigitcanlar, T., Limb, M., & Washington, T. (2023). The
making of smart campus: A review and conceptual framework. Buildings,
13(4), 891. <https://doi.org/10.3390/buildings13040891>

Gamage, T. C. M., Jayasinghe, U. A. C. L., Premadasa, P. K. R. B.,
Dombepola, D. A. C. T., De Silva, D. I., & De Zoysa, R. R. P. (2022).
Computerized System to Manage Business Functionalities for a Gymnasium.
International Journal of Engineering and Management Research, 12(5),
73-81.

Satanasaowapak, P., Kawseewai, W., Promlee, S., & Vilamat, A. (2021).
Residential access control system using QR code and the IoT. Proceedings
of the 2021 IEEE International Conference on Computer Science and
Engineering (CSE), 44--50.

Villanueva, M. C., Sevilla, S. A. S., & Verecio, R. L. (2025).
Development of Olympic Fitness Gym Management System with integrated QR
code technology. International Journal of Advanced Computer Technology,
14(2), 120--129.

Inyangetoh, J. A., & Johnson, E. A. (2025). Development of QR code-based
authentication system for examination admission. Nigerian Journal of
Information Systems and Security, 10(1), 21--31.

Adedoyin, M., & Olukoya, F. (2024). Development of a smart lock system
using QR code. African Journal of Engineering Research and Development
(AJERD).

Mohaideen, M. S. J., Vinu, V., Visagar, M., & Arjun, S. (2025). Visitor
management system with QR code-based check-in. International Journal of
Innovative Research in Computer and Communication Engineering, 13(4),
55--63.

Abu Sneineh, A., & Salah, W. A. (2025). Smart attendance system for
university students based on QR code. International Journal of Advanced
Computer Science and Applications (IJACSA), 16(1), 45--52.

Seeth, A. (2024). Balancing security and efficiency in isolated QR
code-based authentication systems in real estate (Master's thesis).
University of Tampere, Finland.

Hasan, A., Patel, N., & Hasan, M. (2025). A full-stack gym management
system for fitness centers using MERN architecture. International
Journal of Computer Applications and Information Technology, 14(2),
67--74.

Pujari, A., & Patel, R. (2025). Exploring the MERN stack: An in-depth
analysis of full-stack JavaScript development for scalable and efficient
web applications. Journal of Emerging Technologies and Innovative
Research (JETIR), 12(3), 110--118.

Badriah, N., & Shandy, S. V. (2024). Optimization of gym check-in and
membership information system: QR code scanner based. Scientific Journal
of Information System, 2(2), 27--29.
<https://doi.org/10.70429/sjis.v2i2.131>

Sachan, D. (2025, October 10). Incremental model in software
engineering. Scaler
Topics.https://www.scaler.com/topics/incremental-model-in-software-engineering/

# APPENDIX A

Live Application URL: <https://gymtrace.vercel.app/>

Administrator Assessment Credentials
