# VeraNode

### basic setup for now

1. create venv
``` 
python -m venv venv

source venv/bin/activate
```

2. install requirements
```
pip install -r requirements/dev.txt
```

3. start a postgres container using docker
```
docker run --name veranode-postgres \
  -e POSTGRES_USER=veranode \
  -e POSTGRES_PASSWORD=veranode_dev_password \
  -e POSTGRES_DB=veranode_db \
  -p 5432:5432 \
  -d postgres:16-alpine
```

4. start a redis container using docker
```
docker run -d --name veranode-redis -p 6379:6379 redis:7-alpine
```

5. run celery
```
celery -A app.workers.celery_app worker --loglevel=info --pool=prefork
```

6. run fastAPI server in a different terminal

```
source venv/bin/activate

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```