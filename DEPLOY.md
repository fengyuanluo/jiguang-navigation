# Deployment Guide

This application is containerized using Docker. Follow these steps to deploy it.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

1.  **Clone or download the project.**
2.  **Navigate to the project directory.**
3.  **Run the application:**

    ```bash
    docker-compose up -d
    ```

4.  **Access the application:**
    Open your browser and visit `http://localhost:2266`.

### Default Credentials
- **Username**: `admin`
- **Password**: `123456`

## Data Persistence

The application uses local volumes to persist data:

-   **Database**: Stored in `./data/dev.db` (mapped to `/app/prisma/dev.db` inside the container).
-   **Uploads**: Stored in `./uploads` (mapped to `/app/public/uploads` inside the container).

## Managing the Application

-   **Stop the application:**
    ```bash
    docker-compose down
    ```

-   **View logs:**
    ```bash
    docker-compose logs -f
    ```

-   **Update the application:**
    Pull the new code/image and restart:
    ```bash
    docker-compose down
    docker-compose up -d --build
    ```
