FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir \
    networkx==3.2.1 \
    plotly==5.18.0 \
    pandas==2.1.4 \
    kaleido==0.2.1

# Copy the visualization script
COPY nexus_visualizer.py /app/

# Create output directory
RUN mkdir -p /results

ENTRYPOINT ["python", "nexus_visualizer.py"]
