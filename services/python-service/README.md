# Python MCP Service

Clinical intelligence and data analysis service built with Flask and Python.

## Overview

This service provides Model Context Protocol (MCP) servers for:
- Clinical Protocol Guidelines
- Lab Results Analysis
- Patient Risk Assessment
- Data Science Integration

## Technology Stack

- **Python 3.11+**
- **Framework**: Flask 3.0
- **Database**: PostgreSQL 16
- **ORM**: SQLAlchemy 2.0
- **ASGI Server**: Gunicorn

## Project Structure

```
python-service/
├── requirements.txt
├── Dockerfile
├── .env.example
├── README.md (this file)
└── src/
    ├── app.py
    ├── mcp/
    │   ├── clinical_protocol_server.py
    │   ├── lab_results_server.py
    │   └── risk_assessment_server.py
    ├── service/
    │   ├── clinical_service.py
    │   ├── lab_service.py
    │   └── risk_service.py
    ├── models/
    │   ├── clinical_protocol.py
    │   ├── lab_result.py
    │   └── risk_assessment.py
    ├── config/
    │   └── database.py
    └── utils/
        ├── logger.py
        └── validators.py
```

## Development

### Setup Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Run Service
```bash
python src/app.py
```

### Test
```bash
pytest tests/
```

## API Endpoints

- `GET /health` - Service health check
- `GET /info` - Service information
- `POST /api/protocols` - Get clinical protocols
- `POST /api/lab-results` - Submit lab results
- `GET /api/risk/{patient_id}` - Get patient risk assessment

## Configuration

### Environment Variables
```
FLASK_ENV=development
FLASK_DEBUG=True
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/patient_records
SERVICE_NAME=python-service
LOG_LEVEL=INFO
```

### Setup .env File
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Docker

### Build Image
```bash
docker build -t patient-records-python-service .
```

### Run Container
```bash
docker run -p 5000:5000 \
  -e DATABASE_URL=postgresql://user:password@postgres:5432/patient_records \
  patient-records-python-service
```

## Dependencies

Key dependencies:
- Flask - Web framework
- Flask-CORS - Cross-origin support
- SQLAlchemy - ORM
- psycopg2 - PostgreSQL adapter
- Pydantic - Data validation
- python-dotenv - Environment configuration
- Gunicorn - Production server

See `requirements.txt` for complete list.

## Development Workflow

### Add New Dependency
```bash
pip install <package>
pip freeze > requirements.txt
```

### Database Migrations
```bash
# Using Alembic (planned)
alembic init migrations
alembic revision --autogenerate -m "Add patients table"
alembic upgrade head
```

### Code Quality
```bash
# Linting
flake8 src/

# Type checking
mypy src/

# Formatting
black src/
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src tests/

# Run specific test
pytest tests/test_clinical_service.py::test_get_protocols

# Run in watch mode
pytest-watch
```

## Contributing

1. Follow PEP 8 style guide
2. Use type hints in function signatures
3. Write docstrings for all functions
4. Add unit tests for new functionality
5. Update requirements.txt after adding dependencies

## Troubleshooting

### Database Connection Issues
```bash
# Test PostgreSQL connection
psql -h localhost -U patient_user -d patient_records

# Check connection string format
echo $DATABASE_URL
```

### Module Import Errors
```bash
# Ensure virtual environment is activated
which python  # Should show venv path

# Reinstall requirements
pip install -r requirements.txt --force-reinstall
```

## Performance Optimization

- Connection pooling configured in SQLAlchemy
- Query optimization with proper indexing
- Caching layer planned for Phase 2
- Async processing with Celery (planned)

## Security

- Input validation with Pydantic
- SQL injection prevention via SQLAlchemy ORM
- CORS configuration for API access
- Environment-based secrets management

## Diabetes Clinic Quickstart (SQLite)

This repository contains a small helper to initialize a project-local SQLite database for the diabetes clinic pilot.

1. Create the virtualenv and install dependencies (recommended `.venv`):

```bash
# create and use project-local .venv
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Initialize the SQLite database used by the clinic UI:

```bash
python src/init_db.py
```

This will create `data/diabetes.db` with basic tables (`patients`, `medical_records`, `lab_results`, `prescriptions`) and sample data.

3. Start the service (it will pick up `data/diabetes.db` automatically):

```bash
python src/app.py
```

4. Point the React UI to this service (development): add a `proxy` entry in `services/web-ui/package.json` or configure the dev server to forward `/api` to the Python service (default port `5000`).

If you want me to add the `proxy` field and a docker-compose service for a minimal two-container dev setup (React + Python/SQLite), I can scaffold that next.
