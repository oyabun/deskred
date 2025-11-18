FROM python:3.12-slim

WORKDIR /app

# Install dependencies including required system packages for weasyprint
RUN apt-get update && apt-get install -y \
    git \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Clone Naminter and install it properly
RUN git clone https://github.com/3xp0rt/Naminter.git . && \
    pip install --no-cache-dir .

# Create results directory
RUN mkdir -p /results

# Set entrypoint (naminter command is now installed)
ENTRYPOINT ["naminter"]
CMD ["--help"]
