FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY pyproject.toml README.md ./
COPY backend ./backend
COPY infra/oci/scripts ./infra/oci/scripts
RUN pip install --no-cache-dir '.[observability,oci]'

USER 65532:65532
ENTRYPOINT ["racklens"]
