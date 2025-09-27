AWS rotation playbook

Steps to rotate and revoke AWS credentials found in the repository or history:

1. Identify the exposed credential (access key ID or role).
2. Immediately create a replacement credential/role with least privilege required.
3. Update all systems (CI/CD, servers, lambda env vars, configs) to use the new credential stored in AWS Secrets Manager or Parameter Store.
4. Revoke the old credential (Delete access key or remove role policy) once rollout is verified.
5. Search CloudTrail for suspicious use of the old key and investigate any anomalies.
6. Notify internal security and affected teams and record rotation evidence in the triage issue.

Notes:

- Use IAM Access Analyzer and service control policies where appropriate.
- Rotate programmatically using AWS CLI or IaC (CloudFormation/Terraform) if possible.
- Ensure no secret is stored in plaintext in repository files or CI logs.
