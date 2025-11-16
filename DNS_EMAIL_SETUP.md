# DNS Email Configuration for birdr.pro (Self-Hosted Email Server)

This guide explains how to set up DNS records (SPF, DKIM, DMARC) so that emails sent directly from your server at `birdr.pro` are accepted by Gmail and other email providers.

## Overview

To ensure emails from `info@birdr.pro` are not marked as spam, you need to configure three types of DNS records:

1. **SPF (Sender Policy Framework)** - Authorizes which servers can send emails for your domain
2. **DKIM (DomainKeys Identified Mail)** - Adds cryptographic signatures to verify email authenticity
3. **DMARC (Domain-based Message Authentication)** - Policy for handling emails that fail SPF/DKIM checks

## Prerequisites

Before setting up DNS records, you need:
1. Your server's public IP address (the IP that sends emails)
2. DKIM keys generated on your mail server
3. Access to your DNS provider's control panel

## Step 1: Find Your Server's IP Address

Find the public IP address of the server that will send emails:

```bash
# On your server, run:
curl ifconfig.me
# or
hostname -I
```

Or check your hosting provider's dashboard for the server's IP address.

## Step 2: Configure SPF Record

The SPF record authorizes your server to send emails for `birdr.pro`.

### SPF Record

Add this TXT record to your DNS:

```
Type: TXT
Name: @ (or birdr.pro)
Value: v=spf1 ip4:YOUR_SERVER_IP ~all
TTL: 3600
```

**Replace `YOUR_SERVER_IP` with your actual server IP address.**

### Examples:

If your server IP is `192.0.2.1`:
```
v=spf1 ip4:192.0.2.1 ~all
```

If you have multiple IPs:
```
v=spf1 ip4:192.0.2.1 ip4:192.0.2.2 ~all
```

If your server hostname resolves to the IP:
```
v=spf1 a:birdr.pro ~all
```

**SPF Modifiers:**
- `~all` (soft fail) - Other servers are not authorized, but don't reject
- `-all` (hard fail) - Strictly reject emails from unauthorized servers (use after testing)

## Step 3: Configure DKIM Record

DKIM adds a cryptographic signature to your emails. You need to generate DKIM keys on your mail server first.

### Generate DKIM Keys on Your Server

If using Postfix (common on Linux servers):

```bash
# Install opendkim if not already installed
sudo apt-get install opendkim opendkim-tools

# Generate DKIM key pair
sudo mkdir -p /etc/opendkim/keys/birdr.pro
sudo opendkim-genkey -t -s default -d birdr.pro
sudo mv default.private /etc/opendkim/keys/birdr.pro/
sudo mv default.txt /etc/opendkim/keys/birdr.pro/
sudo chown -R opendkim:opendkim /etc/opendkim/keys/birdr.pro
```

The `default.txt` file will contain your DKIM public key.

### Extract DKIM Public Key

View the public key:
```bash
cat /etc/opendkim/keys/birdr.pro/default.txt
```

You'll see something like:
```
default._domainkey.birdr.pro. IN TXT "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..."
```

### Add DKIM Record to DNS

Add a TXT record with the selector name (usually `default`):

```
Type: TXT
Name: default._domainkey (or default._domainkey.birdr.pro)
Value: v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY_HERE
TTL: 3600
```

**Important:** 
- Remove quotes from the value
- Remove line breaks - the entire key should be on one line
- The selector name (`default`) can be anything, but must match what's configured on your server

### Alternative: Using Python to Generate DKIM Keys

If you prefer to generate keys in Python:

```python
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import base64

# Generate private key
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048
)

# Save private key
pem_private = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)

# Get public key
public_key = private_key.public_key()
pem_public = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)

# Extract base64 public key (remove headers and newlines)
public_key_b64 = ''.join(pem_public.decode().split('\n')[1:-2])

# DNS record value
dkim_record = f"v=DKIM1; k=rsa; p={public_key_b64}"
print(f"DNS TXT record for default._domainkey:")
print(dkim_record)
```

## Step 4: Configure DMARC Record

DMARC tells receiving servers what to do with emails that fail SPF or DKIM checks.

### DMARC Record

Add this TXT record:

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:info@birdr.pro
TTL: 3600
```

### DMARC Policy Options

**For Testing (Start Here):**
```
v=DMARC1; p=none; rua=mailto:info@birdr.pro
```
- `p=none` - Don't take any action, just monitor

**After Testing:**
```
v=DMARC1; p=quarantine; rua=mailto:info@birdr.pro
```
- `p=quarantine` - Send failed emails to spam folder

**Strict (After Everything Works):**
```
v=DMARC1; p=reject; rua=mailto:info@birdr.pro; ruf=mailto:info@birdr.pro
```
- `p=reject` - Reject emails that fail authentication
- `ruf=mailto:...` - Also send forensic reports for individual failures

### DMARC Tags Explained

- `v=DMARC1` - DMARC version
- `p=` - Policy: `none`, `quarantine`, or `reject`
- `rua=mailto:...` - Email address for aggregate reports (daily summaries)
- `ruf=mailto:...` - Email address for forensic reports (individual failures)
- `pct=100` - Percentage of emails to apply policy to (default 100)
- `sp=` - Subdomain policy (applies to subdomains)

## Step 5: Configure Your Mail Server

### For Postfix (Linux)

1. **Install and configure OpenDKIM:**

```bash
sudo apt-get install opendkim opendkim-tools
```

2. **Edit `/etc/opendkim.conf`:**

```
Domain                  birdr.pro
KeyFile                 /etc/opendkim/keys/birdr.pro/default.private
Selector                default
Socket                  inet:8891@localhost
```

3. **Edit `/etc/postfix/main.cf`:**

```
# Add DKIM signing
milter_protocol = 2
milter_default_action = accept
smtpd_milters = inet:localhost:8891
non_smtpd_milters = inet:localhost:8891
```

4. **Restart services:**

```bash
sudo systemctl restart opendkim
sudo systemctl restart postfix
```

### For Django (Python)

If using Django's email backend directly, you can use the `django-ses` or configure Postfix to relay through your Django app.

## Step 6: Verify DNS Records

After adding the DNS records, verify they're working:

### Online Tools:
1. **MXToolbox SPF Check**: https://mxtoolbox.com/spf.aspx
2. **MXToolbox DKIM Check**: https://mxtoolbox.com/dkim.aspx
3. **DMARC Analyzer**: https://dmarcian.com/dmarc-xml/
4. **Google Admin Toolbox**: https://toolbox.googleapps.com/apps/checkmx/

### Command Line:
```bash
# Check SPF
dig TXT birdr.pro

# Check DMARC
dig TXT _dmarc.birdr.pro

# Check DKIM
dig TXT default._domainkey.birdr.pro
```

### Expected Results:

**SPF:**
```
birdr.pro. 3600 IN TXT "v=spf1 ip4:YOUR_IP ~all"
```

**DMARC:**
```
_dmarc.birdr.pro. 3600 IN TXT "v=DMARC1; p=none; rua=mailto:info@birdr.pro"
```

**DKIM:**
```
default._domainkey.birdr.pro. 3600 IN TXT "v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY..."
```

## Step 7: Test Email Delivery

1. **Send a test email** from your Django application to a Gmail address
2. **Check email headers** in Gmail:
   - Open the email
   - Click the three dots menu → "Show original"
   - Look for:
     - `SPF: PASS`
     - `DKIM: 'PASS'` (with domain `birdr.pro`)
     - `DMARC: PASS`

### Sample Email Headers (What to Look For):

```
Received-SPF: pass (google.com: domain of info@birdr.pro designates YOUR_IP as permitted sender)
Authentication-Results: mx.google.com;
       dkim=pass header.i=@birdr.pro header.s=default header.b=...;
       spf=pass (google.com: domain of info@birdr.pro designates YOUR_IP as permitted sender) smtp.mailfrom=info@birdr.pro;
       dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=birdr.pro
```

## Step 8: Monitor DMARC Reports

The `rua=mailto:info@birdr.pro` in your DMARC record will send aggregate reports. You can:
- Set up an email address to receive reports
- Use a service like Postmark or Dmarcian to parse reports
- Check your email inbox for reports from `noreply-dmarc-support@google.com` and similar addresses

## Complete DNS Records Summary

Here's a summary of all DNS records you need to add:

```
Record 1: SPF
Type: TXT
Name: @
Value: v=spf1 ip4:YOUR_SERVER_IP ~all

Record 2: DKIM
Type: TXT
Name: default._domainkey
Value: v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY

Record 3: DMARC
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:info@birdr.pro
```

## Important Notes

1. **DNS Propagation**: DNS changes can take 24-48 hours to propagate globally
2. **Start with `p=none`**: Begin with `p=none` in DMARC, then gradually move to `p=quarantine` and `p=reject`
3. **Test First**: Always test with a few emails before sending to all users
4. **Monitor**: Keep an eye on spam rates and adjust policies accordingly
5. **Reverse DNS (rDNS)**: Ensure your server's IP has reverse DNS pointing to `birdr.pro` (contact your hosting provider)

## Troubleshooting

### Emails going to spam:
- Verify all DNS records are correct and propagated
- Check that SPF, DKIM, and DMARC all show PASS in email headers
- Ensure your email content isn't spammy (avoid spam trigger words)
- Check that reverse DNS (PTR record) is set for your IP
- Verify your server isn't on any blacklists: https://mxtoolbox.com/blacklists.aspx

### SPF not working:
- Verify the IP address in the SPF record matches your server's IP
- Check for typos in the SPF record
- Ensure the record is a TXT type, not SPF type (SPF type is deprecated)

### DKIM not working:
- Verify the selector name matches between DNS and server config
- Check that the public key in DNS matches the private key on server
- Ensure there are no line breaks in the DNS record value
- Verify OpenDKIM is running and signing emails

### DNS records not working:
- Wait 24-48 hours for propagation
- Double-check record types (TXT)
- Verify record names (with/without trailing dot)
- Check for typos in record values
- Use `dig` or online tools to verify records are live

### Reverse DNS (rDNS) Setup

Many email providers check reverse DNS. Contact your hosting provider to set up a PTR record:
- IP address → `birdr.pro`
- This helps with email deliverability

## Additional Resources

- SPF Record Syntax: https://www.openspf.org/SPF_Record_Syntax
- DKIM Overview: https://dkim.org/
- DMARC Guide: https://dmarc.org/wiki/FAQ
- Email Deliverability Best Practices: https://www.mail-tester.com/
