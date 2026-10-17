SELECT country,
       COUNT(*) AS unique_ip_hashes,
       COUNT(acknowledged_at) AS acknowledged_ip_hashes,
       COALESCE(SUM(clicks),0) AS acknowledgement_clicks
FROM gate_visitors GROUP BY country ORDER BY country;
