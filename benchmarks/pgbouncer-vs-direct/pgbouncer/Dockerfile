FROM ubuntu:22.04
RUN apt-get update && apt-get install -y --no-install-recommends pgbouncer postgresql-client && rm -rf /var/lib/apt/lists/*
COPY pgbouncer.ini /etc/pgbouncer/pgbouncer.ini
COPY userlist.txt /etc/pgbouncer/userlist.txt
RUN chown postgres:postgres /etc/pgbouncer/pgbouncer.ini /etc/pgbouncer/userlist.txt
EXPOSE 6432
USER postgres
CMD ["pgbouncer", "/etc/pgbouncer/pgbouncer.ini"]
