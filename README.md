# RCIBM - Cyberdrug Bot

Source code of Telegram bot for organizing the work of volunteers and volunteers in the Cyberdruzhina squads at the Regional Center for Information Security 🛡️ of Youth of the Republic of Khakassia.

## Environment variables reference

| Key                  | Type                   | Description |
| -------------------- | ---------------------- | ----------- |
| `DATABASE_URL`       | string                 |             |
| `TELEGRAM_BOT_TOKEN` | string                 |             |
| `PRE_DEFINED_ADMINS` | Array(numbers)         |             |
| `MODE`               | development/production |             |
| `MEMCACHED_HOSTS`    | Array<string>          |             |

## Commands implementation status (list)

🟢 - implmented, 🟡 - partical (or bugs) implemented, 🔴 - not implemented

| Status | Command       | Description                                                                                                                                                         |
| ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟢     | /help         | Help output by bot commands depending on user role                                                                                                                  |
| 🟢     | /create_org   | Administrative command to set up the organization                                                                                                                   |
| 🟢     | /view_org     | Admin command outputs list of organizations                                                                                                                         |
| 🟢     | /register     | Command to register a user as a volunteer                                                                                                                           |
| 🟡     | /claims       | Command for curators and administrators output a list of claims to join the organization                                                                            |
| 🟢     | /privacy      | Display the text of the privacy policy                                                                                                                              |
| 🟡     | /reports      | Admin command displaying a list of all unprocessed content links                                                                                                    |
| 🟢     | /start        | Display general information about the bot, welcome message                                                                                                          |
| 🔴     | /leaderboard  | Table of leaders among organizations                                                                                                                                |
| 🔴     | /lockdown     | Admin and curatorial command to enable / disable registration in the organization                                                                                   |
| 🟢     | /team         | Table of leaders among the organization's participants                                                                                                              |
| 🟢     | /profile      | Individual volunteer profile, statistics and general information                                                                                                    |
| 🟢     | /feedback     | Command to send a message of arbitrary content to administrators                                                                                                    |
| 🟢     | /set_curator  | Admin team to assign a mentor to an organization                                                                                                                    |
| 🟡     | /broadcast    | A command for administrators and curators to send an arbitrary text to all members of the organization                                                              |
| 🟢     | /g_broadcast  | Admin command that allows you to send an arbitrary text to all registered curators and volunteers                                                                   |
| 🔴     | /rm_volunteer | Mentor and admin team to remove a volunteer from the system                                                                                                         |
| 🟢     | /set_admin    | Administrator command that allows you to assign an administrator from the chat interface                                                                            |
| 🔴     | /rm_org       | Administrator command that allows you to remove a curator from the system from the chat interface                                                                   |
| 🔴     | /rm_admin     | Administrator command allowing to remove an administrator from the system from the chat interface (available only to admins from the `PRE_DEFINED_ADMINS` variable) |

## Deployment

### Easy way: Docker with `compose` plugin (or podman)

> $ docker compose up

### Hardway
