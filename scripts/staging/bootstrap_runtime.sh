#!/usr/bin/env bash

set -euo pipefail

APP_PATH="${APP_PATH:-/var/www/byteforge}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
WEB_GROUP="${WEB_GROUP:-www-data}"
DEPLOY_GIT_KEY="${DEPLOY_GIT_KEY:-/home/${DEPLOY_USER}/.ssh/github_deploy_key}"
QUEUE_SERVICE="${QUEUE_SERVICE:-laravel-queue.service}"
INSTALL_SCHEDULER="${INSTALL_SCHEDULER:-0}"
EXPECTED_QUEUE_LIST="${EXPECTED_QUEUE_LIST:-notifications,default}"
SCHEDULER_TIMER_UNIT="${SCHEDULER_TIMER_UNIT:-laravel-scheduler.timer}"
EXPECTED_SCHEDULER_CRON="${EXPECTED_SCHEDULER_CRON:-* * * * * cd $APP_PATH && php artisan schedule:run >> /dev/null 2>&1}"

abort() {
    echo "bootstrap error: $*" >&2
    exit 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || abort "required command not found: $1"
}

as_root() {
    if [[ "${EUID}" -eq 0 ]]; then
        "$@"
    else
        sudo "$@"
    fi
}

as_deploy() {
    if [[ "$(id -un)" == "$DEPLOY_USER" ]]; then
        "$@"
        return
    fi

    if command -v sudo >/dev/null 2>&1; then
        sudo -u "$DEPLOY_USER" "$@"
        return
    fi

    if [[ "${EUID}" -eq 0 ]]; then
        su -s /bin/bash "$DEPLOY_USER" -c "$(printf '%q ' "$@")"
        return
    fi

    abort "sudo is required to run commands as ${DEPLOY_USER}"
}

require_command stat
require_command git
require_command install

queue_subscription_is_valid() {
    local details="$1"

    grep -Eq -- "--queue(=|[[:space:]])${EXPECTED_QUEUE_LIST}([[:space:]]|$)" <<<"$details"
}

scheduler_is_configured() {
    local deploy_crontab=""

    deploy_crontab="$(as_deploy crontab -l 2>/dev/null || true)"
    if grep -Fqx "$EXPECTED_SCHEDULER_CRON" <<<"$deploy_crontab"; then
        echo "scheduler crontab verified"
        return 0
    fi

    if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files "$SCHEDULER_TIMER_UNIT" >/dev/null 2>&1; then
        if systemctl is-active --quiet "$SCHEDULER_TIMER_UNIT"; then
            echo "scheduler timer active: $SCHEDULER_TIMER_UNIT"
            systemctl show "$SCHEDULER_TIMER_UNIT" -p LoadState -p ActiveState -p SubState -p UnitFileState || true
            return 0
        fi
    fi

    return 1
}

id "$DEPLOY_USER" >/dev/null 2>&1 || abort "deploy user does not exist: $DEPLOY_USER"
[[ -d "$APP_PATH" ]] || abort "app path does not exist: $APP_PATH"

effective_group="$WEB_GROUP"
if ! getent group "$WEB_GROUP" >/dev/null 2>&1; then
    effective_group="$(id -gn "$DEPLOY_USER")"
    echo "warning: group $WEB_GROUP not found; using $effective_group instead"
else
    as_root usermod -aG "$WEB_GROUP" "$DEPLOY_USER"
fi

as_root install -d -m 2775 -o "$DEPLOY_USER" -g "$effective_group" \
    "$APP_PATH/storage" \
    "$APP_PATH/storage/framework" \
    "$APP_PATH/storage/framework/cache" \
    "$APP_PATH/storage/framework/cache/data" \
    "$APP_PATH/storage/framework/sessions" \
    "$APP_PATH/storage/framework/views" \
    "$APP_PATH/storage/logs" \
    "$APP_PATH/bootstrap/cache"

as_root chgrp -R "$effective_group" "$APP_PATH/storage" "$APP_PATH/bootstrap/cache"
as_root chmod -R ug+rwX "$APP_PATH/storage" "$APP_PATH/bootstrap/cache"

for key in "$APP_PATH/storage/oauth-private.key" "$APP_PATH/storage/oauth-public.key"; do
    if [[ -f "$key" ]]; then
        as_root chown "$DEPLOY_USER:$effective_group" "$key"
        as_root chmod 640 "$key"
    fi
done

as_deploy git config --global --add safe.directory "$APP_PATH"
as_deploy test -r "$DEPLOY_GIT_KEY"
as_deploy test -w "$APP_PATH"
as_deploy test -w "$APP_PATH/storage"
as_deploy test -w "$APP_PATH/storage/logs"
as_deploy test -w "$APP_PATH/bootstrap/cache"

if [[ "$INSTALL_SCHEDULER" == "1" ]]; then
    current_crontab="$(as_deploy crontab -l 2>/dev/null || true)"
    if ! grep -Fqx "$EXPECTED_SCHEDULER_CRON" <<<"$current_crontab"; then
        printf '%s\n%s\n' "$current_crontab" "$EXPECTED_SCHEDULER_CRON" | as_deploy crontab -
    fi
fi

echo "Runtime ownership and writability"
stat -c '%U %G %a %n' \
    "$APP_PATH/storage" \
    "$APP_PATH/storage/logs" \
    "$APP_PATH/bootstrap/cache"

for key in "$APP_PATH/storage/oauth-private.key" "$APP_PATH/storage/oauth-public.key"; do
    if [[ -f "$key" ]]; then
        stat -c '%U %G %a %n' "$key"
    fi
done

echo "Deploy-user verification"
as_deploy bash -lc "cd '$APP_PATH' && test -w . && test -w storage && test -w storage/logs && test -w bootstrap/cache && echo deploy user runtime paths writable"

echo "Queue worker status"
if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files "$QUEUE_SERVICE" >/dev/null 2>&1; then
    queue_details="$(systemctl show "$QUEUE_SERVICE" -p LoadState -p ActiveState -p SubState -p MainPID -p ExecStart || true)"
    printf '%s\n' "$queue_details"
    main_pid="$(systemctl show -p MainPID --value "$QUEUE_SERVICE" || true)"
    if [[ -n "$main_pid" && "$main_pid" != "0" ]]; then
        process_details="$(ps -ww -o user=,group=,pid=,cmd= -p "$main_pid")"
        printf '%s\n' "$process_details"
        queue_details+=$'\n'"$process_details"
    fi

    if grep -Fq 'artisan queue:work' <<<"$queue_details"; then
        queue_subscription_is_valid "$queue_details" || abort "queue worker must subscribe to ${EXPECTED_QUEUE_LIST}"
        echo "queue subscription verified: ${EXPECTED_QUEUE_LIST}"
    fi
else
    queue_details="$(pgrep -fa 'artisan queue:work|artisan horizon' || true)"
    printf '%s\n' "$queue_details"

    if grep -Fq 'artisan queue:work' <<<"$queue_details"; then
        queue_subscription_is_valid "$queue_details" || abort "queue worker must subscribe to ${EXPECTED_QUEUE_LIST}"
        echo "queue subscription verified: ${EXPECTED_QUEUE_LIST}"
    fi
fi

echo "Scheduler crontab"
as_deploy crontab -l || true

scheduler_is_configured || abort "scheduler must be configured via the expected crontab entry or active timer ${SCHEDULER_TIMER_UNIT}"

echo "Bootstrap complete"
