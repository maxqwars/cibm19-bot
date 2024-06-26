# РЦИБМ - Бот Кибердружины

Исходный код Telegram бота для организации работы волонтеров и добровольцев в составе отрядов Кибердружины при Региональном Центре Информационной Безопасности Молодежи РХ.

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

| Status | Command       | Description |
| ------ | ------------- | ----------- |
| 🟢     | /help         | Lorem       |
| 🟢     | /create_org   | Lorem       |
| 🟢     | /view_org     | Lorem       |
| 🟢     | /register     | Lorem       |
| 🟡     | /claims       | Lorem       |
| 🟢     | /privacy      | Lorem       |
| 🟡     | /reports      | Lorem       |
| 🟢     | /start        | Lorem       |
| 🔴     | /leaderboard  | Lorem       |
| 🔴     | /lockdown     | Lorem       |
| 🟢     | /team         | Lorem       |
| 🟢     | /profile      | Lorem       |
| 🟢     | /feedback     | Lorem       |
| 🟢     | /set_curator  | Lorem       |
| 🟡     | /broadcast    | Lorem       |
| 🟢     | /g_broadcast  | Lorem       |
| 🔴     | /rm_volunteer | Lorem       |
| 🟢     | /set_admin    | Lorem       |
| 🔴     | /rm_org       | Lorem       |

## Deployment

### Easy way: Docker with `compose` plugin (or podman)

> $ docker compose up

### Hardway
