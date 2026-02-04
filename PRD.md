# Product Requirements Document

## Overview

This new application is being built for a Hackathon. Here is the scope of this hackathon :

As we evolve Presales to tell differentiating stories and provide more compelling demonstrations of the ability and value of Okta to solve customer challenges, we are launching a new initiative to help you expand your technical and storytelling toolkit through Vibe Coding.

Our mission is to evolve Presales from technical presentation experts into AI-empowered storytellers. By equipping every team member with Claude Code, we are unlocking the power of 'vibe coding'—enabling you to rapidly build bespoke tools and apps that don't just tell a story, but physically demonstrate it. Let’s use this capability to create differentiating moments that wow our prospects and accelerate our deals.

We're specifically looking for applications, tools, and utilities that can be used to show prospects the art of the possible. These are the kinds of assets that used to be only viable for the biggest opportunities. Vibe coding makes them viable for every opportunity.

We’re not looking for utilities and automations aimed at SE productivity. Focus on something that will “wow” a prospect as part of a demo.

## Problem Statement

While a Solution Engineers demo Okta Products, because of the number of UIs, different users being used throughout a demonstration, it's hard for someone watching a live demonstration to keep track of all the use cases demonstrated. These use cases range from basic Login as an end user, to being prompted for MFA, to automating the user creation as an administrator to downstream applications. 

Okta is pivot to speak more and more about the Identity Security Fabric which is the consolidation of IAM, IGA, PAM, ISPM and other key components into one single platform where all these components are interconnected.

## Goals

Create a Live Dashboard (e.g. a Side Browswer) that list all the use cases Okta (accross all products) can provide and adds checkmarks as these uses cases are demonstrated by the Solution Engineer without his involvement. Goal is to ensure the customer/prospect is following along the demonstration and understands what he is being shown, what use cases is demonstrated, when its considered completed, which products from Okta were involved to achieve the use case, what is the outcomes of each use cases (1. Reduce Risk and/or 2. Improve Efficiency -i.e. automation, and/or 3. Improve End User Productivity)

## Target Users

Target User of this Live Dashboard is the Solution Engineer. He will have the dashboard as a seperate browser that he can share on screen live while doing the demosntration.

Customer/Prospect are viewing the dashboard during a live presentation.

## Requirements

This can be clarified with you but the initial idea was to have a live dashboard as a seperate browser that pull logs information from Okta Syslog to help track what are the use cases demonstrated live.

### Functional Requirements

1. A live dashboard with list of use cases greyed out until they are demonstrated. 
2. When they are demonstrated, there should a be checkmark added next to the use case.
3. For each use case, there should be a clear set of sentences on the business outcomes of each (see above)
4. For each use case, we should also which Okta Products are leveraged to accomplish these use cases (e.g. Okta Core SSO, Okta aMFA, Okta ITP, ISPM, etc.)
5. For each use case, a log snipped that was converted into Human Language to show that we've proven this use case
6. Prior to displaying the dashboard, this application should ask the Solution Engineer, who is the customer, how many users do they have, and provide any additional context. The objective would be to tailor the description of each use cases displayed, it should also have an impact on how the business value impacted are worded

### Key Use Cases 

1. User Login, prompted by MFA (because a security policy was triggered)
2. User requesting access to an application
3. Manager of User approving the request (and the hidden processes creating the user in the background)
4. [Help me identify additional use cases]

### Non-Functional Requirements

1. Self Hosted Web Page (i.e. this is a MVP, it can be run locally)
2. Ability to connect to an Okta Org Tenant easily to capture Syslog, We most likely have to setup a hook so that events are pushed to this project
3. Ability to connect with a GenAI solution to help convert/interpret logs into human language

## UIs

1. Generate theme should follow Okta' theme that can be found here : https://www.okta.com/
2. The dashboard should follow the same color, add the logo, apply the same rounded edges, etc.

## Success Metrics

1. This is a prototype, we should be able to showcase 2 use cases 

## Open Questions

Ask me anything to help elaborate this prototype

## Additional Documents to ramp up knowledge

1. Okta official page : https://www.okta.com/ (there's a product section that describe the list of product we sell)
2. Definition of a Identity Security Fabric : https://www.okta.com/identity-101/identity-fabric-the-future-of-identity-and-access-management/
3. Okta docs : https://help.okta.com/en-us/content/index.htm

