FROM python:3.10-slim

RUN apt-get update -y && apt-get install nodejs -y

WORKDIR /app
COPY . .
RUN pip install -r requirements.txt

EXPOSE 5000

CMD FLASK_APP=app.py && flask run --host=0.0.0.0