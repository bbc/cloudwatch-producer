docker-compose --file ./test/scripts/docker-compose.yml up -d

if [ $? -eq 0 ]
then
  echo "Successfully started docker"
else
  echo "Could not start docker" >&2
  exit 1
fi

export AWS_ACCESS_KEY_ID="key"
export AWS_SECRET_ACCESS_KEY="secret"
export AWS_DEFAULT_REGION="eu-west-1"

echo "Waiting for CloudWatch, attempting every 5s"
until $(aws --endpoint-url=http://localhost:4566 cloudwatch list-metrics --region eu-west-1 | grep "{
}" > /dev/null); do
    printf '.'
    sleep 5
done
echo ' Service is up!'
