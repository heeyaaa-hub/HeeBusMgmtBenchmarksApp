# BusMgmtBenchmarks REST API Documentation with Response Examples

This document provides comprehensive examples of using the DoltHub REST API to access the `calvinw/BusMgmtBenchmarks` database, including actual response examples showing the JSON structure returned by each query type.

**⚠️ Important Note**: The API response examples shown in this documentation are for illustrative purposes to demonstrate the JSON structure and data format. The specific companies, financial figures, years, and other data values may have changed since this documentation was created. Always query the live API to get current and accurate data rather than relying on the example values shown here.

## Database Schema

The BusMgmtBenchmarks database contains the following tables with their actual schema definitions retrieved from the live database.

### Complete Table List

The database contains **32 tables and views**:

**Core Tables:**
- `financials` - Raw financial data
- `company_info` - Company master data
- `financial_metrics` - Calculated financial ratios
- `segment_metrics` - Segment-level benchmarks  
- `subsegment_metrics` - Subsegment-level benchmarks

**Annual Benchmark Views:**
- `benchmarks YYYY view` (2018-2024) - Company + metrics by year
- `segment benchmarks YYYY` (2018-2024) - Segment benchmarks by year
- `subsegment benchmarks YYYY` (2018-2024) - Subsegment benchmarks by year
- `segment and company benchmarks YYYY` (2018-2024) - Combined views

### Core Table Schemas

#### 1. `company_info` (Primary Key: `company`)
**Description:** Master table containing company information and segment classifications.

| Field | Type | Null | Key | Description |
|-------|------|------|-----|-------------|
| `company` | VARCHAR(255) | NO | PRI | Company name (Primary Key) |
| `CIK` | INT | YES | | Central Index Key identifier |
| `display_name` | VARCHAR(255) | NO | | Display name for the company |
| `ticker_symbol` | VARCHAR(10) | NO | | Stock ticker symbol |
| `segment` | VARCHAR(255) | YES | | Industry segment classification |
| `subsegment` | VARCHAR(255) | YES | | Industry subsegment classification |
| `currency` | VARCHAR(10) | YES | | Reporting currency (USD, EUR, etc.) |
| `units` | VARCHAR(50) | YES | | Reporting units (thousands, millions, etc.) |

#### 2. `financials` (Primary Key: `company_name`, `year`)
**Description:** Raw financial data for companies across multiple years.

| Field | Type | Null | Key | Description |
|-------|------|------|-----|-------------|
| `company_name` | VARCHAR(255) | NO | PRI | Company name |
| `year` | INT | NO | PRI | Reporting year |
| `reportDate` | DATE | NO | | Report date |
| `Net Revenue` | BIGINT | YES | | Total revenue |
| `Cost of Goods` | BIGINT | YES | | Cost of goods sold |
| `Gross Margin` | BIGINT | YES | | Gross profit margin (calculated field) |
| `SGA` | BIGINT | YES | | Selling, General & Administrative expenses |
| `Operating Profit` | BIGINT | YES | | Operating profit |
| `Net Profit` | BIGINT | YES | | Net profit |
| `Inventory` | BIGINT | YES | | Inventory value |
| `Current Assets` | BIGINT | YES | | Current assets |
| `Total Assets` | BIGINT | YES | | Total assets |
| `Current Liabilities` | BIGINT | YES | | Current liabilities |
| `Liabilities` | BIGINT | YES | | Total liabilities |
| `Total Shareholder Equity` | BIGINT | YES | | Total shareholders' equity |
| `Total Liabilities and Shareholder Equity` | BIGINT | YES | | Balance sheet total |

#### 3. `financial_metrics` (Primary Key: `company_name`, `year`)
**Description:** Calculated financial ratios and metrics derived from the raw financial data.

| Field | Type | Null | Key | Description |
|-------|------|------|-----|-------------|
| `company_name` | VARCHAR(255) | NO | PRI | Company name |
| `year` | INT | NO | PRI | Reporting year |
| `Cost_of_Goods_Percentage` | DECIMAL(10,4) | YES | | Cost of goods as % of revenue |
| `SGA_Percentage` | DECIMAL(10,4) | YES | | SGA as % of revenue |
| `Gross_Margin_Percentage` | DECIMAL(10,4) | YES | | Gross margin as percentage |
| `Operating_Profit_Margin_Percentage` | DECIMAL(10,4) | YES | | Operating margin as percentage |
| `Net_Profit_Margin_Percentage` | DECIMAL(10,4) | YES | | Net margin as percentage |
| `Inventory_Turnover` | DECIMAL(10,4) | YES | | Inventory turnover ratio |
| `Asset_Turnover` | DECIMAL(10,4) | YES | | Asset turnover ratio |
| `Return_on_Assets` | DECIMAL(10,4) | YES | | ROA ratio |
| `Three_Year_Revenue_CAGR` | DECIMAL(10,4) | YES | | 3-year revenue compound annual growth rate |
| `Current_Ratio` | DECIMAL(10,4) | YES | | Current ratio |
| `Quick_Ratio` | DECIMAL(10,4) | YES | | Quick ratio |
| `Sales_Current_Year_vs_LY` | DECIMAL(10,4) | YES | | Sales growth vs last year |
| `Debt_to_Equity` | DECIMAL(10,4) | YES | | Debt-to-equity ratio |

#### 4. `segment_metrics`
**Description:** Aggregate benchmark metrics calculated at the segment level.

**Schema Note:** *Schema details available via API query - contains aggregated versions of the financial metrics above, grouped by segment and year.*

#### 5. `subsegment_metrics`
**Description:** Aggregate benchmark metrics calculated at the subsegment level.

**Schema Note:** *Schema details available via API query - contains aggregated versions of the financial metrics above, grouped by subsegment and year.*

### Annual Benchmark Views

The database includes extensive pre-built views for different analysis needs:

#### 6. Company Benchmark Views (by Year)
**Format:** `benchmarks {YEAR} view`
**Available Years:** 2018, 2019, 2020, 2021, 2022, 2023, 2024

These views combine data from `company_info`, `financials`, and `financial_metrics` to provide a complete picture of company performance with both raw financial data and calculated ratios.

#### 7. Segment Benchmark Views (by Year)  
**Format:** `segment benchmarks {YEAR}`
**Available Years:** 2018, 2019, 2020, 2021, 2022, 2023, 2024

These views provide segment-level aggregate benchmarks for comparing company performance against industry peers.

#### 8. Subsegment Benchmark Views (by Year)
**Format:** `subsegment benchmarks {YEAR}`  
**Available Years:** 2018, 2019, 2020, 2021, 2022, 2023, 2024

These views provide subsegment-level aggregate benchmarks for more granular industry comparisons.

#### 9. Combined Segment and Company Views (by Year)
**Format:** `segment and company benchmarks {YEAR}`
**Available Years:** 2018, 2019, 2020, 2021, 2022, 2023, 2024

These views combine both individual company metrics and their corresponding segment benchmarks for direct comparison analysis.

**Common View Structure:**
```sql
SHOW CREATE VIEW `benchmarks 2023 view`;
DESCRIBE `segment benchmarks 2023`;
```

**Typical Columns in Benchmark Views:**
- Company identifiers (`company`, `display_name`, `ticker_symbol`, `segment`, `subsegment`)
- Raw financial data (`Net Revenue`, `Operating Profit`, `Net Profit`, `Total Assets`, etc.)
- Calculated percentages (`Gross_Margin_Percentage`, `Operating_Profit_Margin_Percentage`, etc.)
- Financial ratios (`Return_on_Assets`, `Asset_Turnover`, `Current_Ratio`, `Debt_to_Equity`, etc.)
- Growth metrics (`Three_Year_Revenue_CAGR`, `Sales_Current_Year_vs_LY`)

### Schema Exploration Queries

To explore the database schema programmatically, use these queries:

**Get all table names:**
```sql
SHOW TABLES;
```

**Get column information for a specific table:**
```sql
DESCRIBE table_name;
-- or
SHOW COLUMNS FROM table_name;
```

**Get detailed table creation syntax:**
```sql
SHOW CREATE TABLE table_name;
```

**Get view definitions:**
```sql
SHOW CREATE VIEW view_name;
```

**Get information about all columns across all tables:**
```sql
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'BusMgmtBenchmarks'
ORDER BY TABLE_NAME, ORDINAL_POSITION;
```

### Data Relationships

The tables are related as follows:

1. **`company_info`** serves as the master company directory with primary key `company`
2. **`financials`** contains raw financial data linked by `company_name` to `company_info.company` and partitioned by `year` (composite PK: `company_name, year`)
3. **`financial_metrics`** contains calculated ratios derived from `financials`, linked by `company_name` and `year` (composite PK: `company_name, year`)
4. **`segment_metrics`** aggregates data from `financial_metrics` grouped by `segment` and `year`
5. **`subsegment_metrics`** aggregates data from `financial_metrics` grouped by `subsegment` and `year`
6. **Annual benchmark views** (`benchmarks YYYY view`) join:
   - Company info (`company_info`) 
   - Raw financials (`financials`)
   - Calculated metrics (`financial_metrics`)
7. **Segment benchmark views** (`segment benchmarks YYYY`) provide aggregated segment performance data
8. **Subsegment benchmark views** (`subsegment benchmarks YYYY`) provide aggregated subsegment performance data
9. **Combined views** (`segment and company benchmarks YYYY`) merge individual company data with segment benchmarks

**Key Relationships:**
- `company_info.company` ↔ `financials.company_name`
- `company_info.company` ↔ `financial_metrics.company_name`
- `company_info.segment` ↔ `segment_metrics.segment`
- `company_info.subsegment` ↔ `subsegment_metrics.subsegment`

### Primary Keys and Indexes

**Primary Key Structure:**

| Table | Primary Key | Notes |
|-------|-------------|-------|
| `company_info` | `company` | Single column PK |
| `financials` | `company_name, year` | Composite PK |
| `financial_metrics` | `company_name, year` | Composite PK |
| `segment_metrics` | Likely `segment, year` | *To be confirmed via API* |
| `subsegment_metrics` | Likely `subsegment, year` | *To be confirmed via API* |

**Foreign Key Relationships:**
- `financials.company_name` references `company_info.company`
- `financial_metrics.company_name` references `company_info.company`

**Index Information:**
To get complete index and constraint information, use:
```sql
SHOW KEYS FROM table_name;
SHOW CREATE TABLE table_name;
```

## Base URL Structure

All API calls follow this pattern:
```
https://www.dolthub.com/api/v1alpha1/{owner}/{database}?q={SQL_QUERY}
```

For the BusMgmtBenchmarks database:
```
https://www.dolthub.com/api/v1alpha1/calvinw/BusMgmtBenchmarks?q={SQL_QUERY}
```

### URL Encoding Example

The SQL queries shown in this document need to be URL-encoded when used in actual API calls. For example:

**Clean SQL:**
```sql
SELECT * FROM company_info WHERE segment = 'Grocery'
```

**URL-encoded for API:**
```
https://www.dolthub.com/api/v1alpha1/calvinw/BusMgmtBenchmarks?q=SELECT%20*%20FROM%20company_info%20WHERE%20segment%20%3D%20%27Grocery%27
```

**Note:** Most modern clients and AI assistants will handle URL encoding automatically.

## Authentication

The BusMgmtBenchmarks database is public, so no authentication is required for read operations.

## Response Format Overview

All successful queries return JSON in this standardized format:

```json
{
  "query_execution_status": "Success",
  "query_execution_message": "",
  "repository_owner": "calvinw",
  "repository_name": "BusMgmtBenchmarks", 
  "commit_ref": "main",
  "sql_query": "YOUR_SQL_QUERY",
  "schema": [
    {
      "columnName": "column_name",
      "columnType": "data_type"
    }
  ],
  "rows": [
    {
      "column_name": "value1"
    }
  ]
}
```

## Basic Database Operations

### Table Listing

**Query:**
```sql
SHOW TABLES
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "query_execution_message": "",
  "repository_owner": "calvinw",
  "repository_name": "BusMgmtBenchmarks",
  "commit_ref": "main",
  "sql_query": "SHOW TABLES",
  "schema": [
    {
      "columnName": "Tables_in_BusMgmtBenchmarks",
      "columnType": "longtext"
    }
  ],
  "rows": [
    {"Tables_in_BusMgmtBenchmarks": "benchmarks 2018 view"},
    {"Tables_in_BusMgmtBenchmarks": "benchmarks 2019 view"},
    {"Tables_in_BusMgmtBenchmarks": "benchmarks 2020 view"},
    {"Tables_in_BusMgmtBenchmarks": "benchmarks 2021 view"},
    {"Tables_in_BusMgmtBenchmarks": "benchmarks 2022 view"},
    {"Tables_in_BusMgmtBenchmarks": "benchmarks 2023 view"},
    {"Tables_in_BusMgmtBenchmarks": "benchmarks 2024 view"},
    {"Tables_in_BusMgmtBenchmarks": "financials"},
    {"Tables_in_BusMgmtBenchmarks": "company_info"},
    {"Tables_in_BusMgmtBenchmarks": "financial_metrics"},
    {"Tables_in_BusMgmtBenchmarks": "segment_metrics"},
    {"Tables_in_BusMgmtBenchmarks": "subsegment_metrics"}
  ]
}
```

## Core Table Queries

### 1. Company Information

**Query:** Get all companies with their segments and subsegments
```sql
SELECT company, display_name, ticker_symbol, segment, subsegment 
FROM company_info 
ORDER BY segment, display_name 
LIMIT 10
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "schema": [
    {"columnName": "company", "columnType": "varchar(255)"},
    {"columnName": "display_name", "columnType": "varchar(255)"},
    {"columnName": "ticker_symbol", "columnType": "varchar(10)"},
    {"columnName": "segment", "columnType": "varchar(255)"},
    {"columnName": "subsegment", "columnType": "varchar(255)"}
  ],
  "rows": [
    {
      "company": "Dillard's",
      "display_name": "Dillard's", 
      "ticker_symbol": "DDS",
      "segment": "Department Store",
      "subsegment": null
    },
    {
      "company": "Walmart",
      "display_name": "Walmart",
      "ticker_symbol": "WMT", 
      "segment": "Discount Store",
      "subsegment": null
    }
  ]
}
```

**Query:** Find companies in a specific segment
```sql
SELECT * FROM company_info 
WHERE segment = 'Grocery' 
ORDER BY display_name
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "schema": [
    {"columnName": "company", "columnType": "varchar(255)"},
    {"columnName": "CIK", "columnType": "int"},
    {"columnName": "display_name", "columnType": "varchar(255)"},
    {"columnName": "ticker_symbol", "columnType": "varchar(10)"},
    {"columnName": "segment", "columnType": "varchar(255)"},
    {"columnName": "subsegment", "columnType": "varchar(255)"},
    {"columnName": "currency", "columnType": "varchar(10)"},
    {"columnName": "units", "columnType": "varchar(50)"}
  ],
  "rows": [
    {
      "company": "Ahold Delhaize",
      "CIK": null,
      "display_name": "Ahold Delhaize",
      "ticker_symbol": "AD.AS",
      "segment": "Grocery",
      "subsegment": null,
      "currency": "EUR",
      "units": "thousands"
    },
    {
      "company": "Albertsons",
      "CIK": "1646972",
      "display_name": "Albertsons",
      "ticker_symbol": "ACI",
      "segment": "Grocery", 
      "subsegment": null,
      "currency": "USD",
      "units": "thousands"
    },
    {
      "company": "Kroger",
      "CIK": "56873",
      "display_name": "Kroger",
      "ticker_symbol": "KR",
      "segment": "Grocery",
      "subsegment": null,
      "currency": "USD",
      "units": "thousands"
    }
  ]
}
```

**Query:** Get company info by ticker symbol
```sql
SELECT * FROM company_info 
WHERE ticker_symbol = 'WMT'
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "rows": [
    {
      "company": "Walmart",
      "CIK": "104169",
      "display_name": "Walmart",
      "ticker_symbol": "WMT",
      "segment": "Discount Store",
      "subsegment": null,
      "currency": "USD",
      "units": "thousands"
    }
  ]
}
```

### 2. Financial Data

**Query:** Get top revenue companies in 2023
```sql
SELECT company_name, year, `Net Revenue`, `Gross Margin`, `Operating Profit`, `Net Profit` 
FROM financials 
WHERE year = 2023 
ORDER BY `Net Revenue` DESC 
LIMIT 10
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "schema": [
    {"columnName": "company_name", "columnType": "varchar(255)"},
    {"columnName": "year", "columnType": "int"},
    {"columnName": "Net Revenue", "columnType": "bigint"},
    {"columnName": "Gross Margin", "columnType": "bigint"},
    {"columnName": "Operating Profit", "columnType": "bigint"},
    {"columnName": "Net Profit", "columnType": "bigint"}
  ],
  "rows": [
    {
      "company_name": "Walmart",
      "year": "2023",
      "Net Revenue": "648125000",
      "Gross Margin": "157983000", 
      "Operating Profit": "27012000",
      "Net Profit": "15511000"
    },
    {
      "company_name": "Amazon",
      "year": "2023",
      "Net Revenue": "574785000",
      "Gross Margin": "270046000",
      "Operating Profit": "36852000",
      "Net Profit": "30425000"
    },
    {
      "company_name": "CVS",
      "year": "2023", 
      "Net Revenue": "357776000",
      "Gross Margin": "140678000",
      "Operating Profit": "13743000",
      "Net Profit": "8344000"
    }
  ]
}
```

### 3. Financial Metrics

**Query:** Get profitability metrics for top performers
```sql
SELECT company_name, year, Gross_Margin_Percentage, Operating_Profit_Margin_Percentage, 
       Net_Profit_Margin_Percentage, Return_on_Assets 
FROM financial_metrics 
WHERE year = 2023 
ORDER BY Return_on_Assets DESC 
LIMIT 10
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "schema": [
    {"columnName": "company_name", "columnType": "varchar(255)"},
    {"columnName": "year", "columnType": "int"},
    {"columnName": "Gross_Margin_Percentage", "columnType": "decimal(10,4)"},
    {"columnName": "Operating_Profit_Margin_Percentage", "columnType": "decimal(10,4)"},
    {"columnName": "Net_Profit_Margin_Percentage", "columnType": "decimal(10,4)"},
    {"columnName": "Return_on_Assets", "columnType": "decimal(10,4)"}
  ],
  "rows": [
    {
      "company_name": "Ulta Beauty",
      "year": "2023",
      "Gross_Margin_Percentage": "39.0915",
      "Operating_Profit_Margin_Percentage": "14.9726",
      "Net_Profit_Margin_Percentage": "11.5193",
      "Return_on_Assets": "22.6214"
    },
    {
      "company_name": "Lululemon",
      "year": "2023",
      "Gross_Margin_Percentage": "58.3142",
      "Operating_Profit_Margin_Percentage": "22.1709",
      "Net_Profit_Margin_Percentage": "16.1155",
      "Return_on_Assets": "21.8585"
    },
    {
      "company_name": "Home Depot",
      "year": "2023",
      "Gross_Margin_Percentage": "33.3794",
      "Operating_Profit_Margin_Percentage": "14.2066",
      "Net_Profit_Margin_Percentage": "9.9188", 
      "Return_on_Assets": "19.7870"
    }
  ]
}
```

**Query:** Get efficiency ratios
```sql
SELECT company_name, Asset_Turnover, Inventory_Turnover, Current_Ratio, Quick_Ratio 
FROM financial_metrics 
WHERE year = 2023 
ORDER BY Asset_Turnover DESC 
LIMIT 10
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "rows": [
    {
      "company_name": "Costco",
      "Asset_Turnover": "3.5118",
      "Inventory_Turnover": "12.7672",
      "Current_Ratio": "1.0684",
      "Quick_Ratio": "0.5726"
    },
    {
      "company_name": "Chewy", 
      "Asset_Turnover": "3.4980",
      "Inventory_Turnover": "11.1032",
      "Current_Ratio": "0.9969",
      "Quick_Ratio": "0.6562"
    },
    {
      "company_name": "Walmart",
      "Asset_Turnover": "2.5679",
      "Inventory_Turnover": "8.9292",
      "Current_Ratio": "0.8319",
      "Quick_Ratio": "0.2379"
    }
  ]
}
```

## Benchmark Queries

### 1. Segment Benchmarks

**Query:** Get benchmark metrics for all segments in 2023
```sql
SELECT * FROM segment_metrics 
WHERE year = 2023 
ORDER BY segment
```

**Response Example (truncated):**
```json
{
  "query_execution_status": "Success",
  "schema": [
    {"columnName": "segment", "columnType": "varchar(255)"},
    {"columnName": "year", "columnType": "int"},
    {"columnName": "Gross_Margin_Percentage", "columnType": "decimal(10,4)"},
    {"columnName": "Operating_Profit_Margin_Percentage", "columnType": "decimal(10,4)"},
    {"columnName": "Return_on_Assets", "columnType": "decimal(10,4)"}
  ],
  "rows": [
    {
      "segment": "Department Store",
      "year": "2023",
      "Gross_Margin_Percentage": "39.6353",
      "Operating_Profit_Margin_Percentage": "3.6495",
      "Return_on_Assets": "3.0722"
    },
    {
      "segment": "Grocery",
      "year": "2023", 
      "Gross_Margin_Percentage": "24.9249",
      "Operating_Profit_Margin_Percentage": "2.5191",
      "Return_on_Assets": "4.2827"
    },
    {
      "segment": "Home Improvement",
      "year": "2023",
      "Gross_Margin_Percentage": "33.5298",
      "Operating_Profit_Margin_Percentage": "13.6927",
      "Return_on_Assets": "18.8029"
    }
  ]
}
```

**Query:** Get specific segment benchmark
```sql
SELECT segment, Gross_Margin_Percentage, Operating_Profit_Margin_Percentage, 
       Net_Profit_Margin_Percentage, Return_on_Assets 
FROM segment_metrics 
WHERE segment = 'Grocery' AND year = 2023
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "rows": [
    {
      "segment": "Grocery",
      "Gross_Margin_Percentage": "24.9249",
      "Operating_Profit_Margin_Percentage": "2.5191",
      "Net_Profit_Margin_Percentage": "1.6773",
      "Return_on_Assets": "4.2827"
    }
  ]
}
```

**Query:** Compare all segment benchmarks by profitability
```sql
SELECT segment, Operating_Profit_Margin_Percentage, Return_on_Assets 
FROM segment_metrics 
WHERE year = 2023 
ORDER BY Return_on_Assets DESC
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "rows": [
    {
      "segment": "Home Improvement",
      "Operating_Profit_Margin_Percentage": "13.6927",
      "Return_on_Assets": "18.8029"
    },
    {
      "segment": "Off Price",
      "Operating_Profit_Margin_Percentage": "10.1988",
      "Return_on_Assets": "12.9230"
    },
    {
      "segment": "Specialty",
      "Operating_Profit_Margin_Percentage": "13.2491",
      "Return_on_Assets": "9.6749"
    },
    {
      "segment": "Warehouse Clubs",
      "Operating_Profit_Margin_Percentage": "3.3991",
      "Return_on_Assets": "9.0070"
    },
    {
      "segment": "Grocery",
      "Operating_Profit_Margin_Percentage": "2.5191",
      "Return_on_Assets": "4.2827"
    }
  ]
}
```

### 2. Subsegment Benchmarks

**Query:** Get subsegment benchmarks for 2023
```sql
SELECT * FROM subsegment_metrics 
WHERE year = 2023 
ORDER BY subsegment 
LIMIT 5
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "rows": [
    {
      "subsegment": "Accessories and Shoes",
      "year": "2023",
      "Gross_Margin_Percentage": "46.2545",
      "Operating_Profit_Margin_Percentage": "8.3039",
      "Return_on_Assets": "7.4664"
    },
    {
      "subsegment": "Apparel",
      "year": "2023",
      "Gross_Margin_Percentage": "45.4315",
      "Operating_Profit_Margin_Percentage": "8.4004",
      "Return_on_Assets": "7.9325"
    },
    {
      "subsegment": "Beauty",
      "year": "2023",
      "Gross_Margin_Percentage": "40.8724",
      "Operating_Profit_Margin_Percentage": "15.8992",
      "Return_on_Assets": "19.4181"
    }
  ]
}
```

## Using Pre-built Views

### 1. Company Benchmarks Views

**Query:** Get all companies in a segment with their metrics
```sql
SELECT company, segment, `Net Revenue`, `Gross Margin %`, `Operating Profit Margin %`, `Return on Assets` 
FROM `benchmarks 2023 view` 
WHERE segment = 'Grocery' 
ORDER BY `Net Revenue` DESC
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "rows": [
    {
      "company": "Kroger",
      "segment": "Grocery",
      "Net Revenue": "150039000",
      "Gross Margin %": "22.2369",
      "Operating Profit Margin %": "2.0635",
      "Return on Assets": "4.2847"
    },
    {
      "company": "Ahold Delhaize", 
      "segment": "Grocery",
      "Net Revenue": "88734000",
      "Gross Margin %": "26.8826",
      "Operating Profit Margin %": "3.2073",
      "Return on Assets": "3.9188"
    },
    {
      "company": "Albertsons",
      "segment": "Grocery",
      "Net Revenue": "79237700",
      "Gross Margin %": "27.8222",
      "Operating Profit Margin %": "2.6110",
      "Return on Assets": "4.9426"
    }
  ]
}
```

**Query:** Get top companies by revenue across all segments
```sql
SELECT company, segment, `Net Revenue`, `Return on Assets` 
FROM `benchmarks 2023 view` 
ORDER BY `Net Revenue` DESC 
LIMIT 10
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "rows": [
    {
      "company": "Walmart",
      "segment": "Discount Store",
      "Net Revenue": "648125000",
      "Return on Assets": "6.1454"
    },
    {
      "company": "Amazon",
      "segment": "Online",
      "Net Revenue": "574785000",
      "Return on Assets": "5.7639"
    },
    {
      "company": "CVS",
      "segment": "Health & Pharmacy",
      "Net Revenue": "357776000",
      "Return on Assets": "3.3412"
    },
    {
      "company": "Costco",
      "segment": "Warehouse Clubs",
      "Net Revenue": "242290000",
      "Return on Assets": "9.1196"
    }
  ]
}
```

## Advanced Analytics Queries

### 1. Peer Comparison

**Query:** Compare multiple companies within the same segment
```sql
SELECT c.display_name, c.segment, m.Gross_Margin_Percentage, m.Operating_Profit_Margin_Percentage, m.Return_on_Assets 
FROM financial_metrics m 
JOIN company_info c ON m.company_name = c.company 
WHERE c.segment = 'Grocery' AND m.year = 2023 
ORDER BY m.Return_on_Assets DESC
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "rows": [
    {
      "display_name": "Albertsons",
      "segment": "Grocery",
      "Gross_Margin_Percentage": "27.8222",
      "Operating_Profit_Margin_Percentage": "2.6110",
      "Return_on_Assets": "4.9426"
    },
    {
      "display_name": "Kroger",
      "segment": "Grocery",
      "Gross_Margin_Percentage": "22.2369",
      "Operating_Profit_Margin_Percentage": "2.0635",
      "Return_on_Assets": "4.2847"
    },
    {
      "display_name": "Ahold Delhaize",
      "segment": "Grocery",
      "Gross_Margin_Percentage": "26.8826",
      "Operating_Profit_Margin_Percentage": "3.2073",
      "Return_on_Assets": "3.9188"
    }
  ]
}
```

### 2. Top Performers Analysis

**Query:** Find top performing companies by Return on Assets
```sql
SELECT c.display_name, c.segment, m.Return_on_Assets, m.Net_Profit_Margin_Percentage 
FROM financial_metrics m 
JOIN company_info c ON m.company_name = c.company 
WHERE m.year = 2023 AND m.Return_on_Assets IS NOT NULL 
ORDER BY m.Return_on_Assets DESC 
LIMIT 10
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "rows": [
    {
      "display_name": "Ulta Beauty",
      "segment": "Specialty",
      "Return_on_Assets": "22.6214",
      "Net_Profit_Margin_Percentage": "11.5193"
    },
    {
      "display_name": "Lululemon",
      "segment": "Specialty",
      "Return_on_Assets": "21.8585",
      "Net_Profit_Margin_Percentage": "16.1155"
    },
    {
      "display_name": "Dillard's",
      "segment": "Department Store",
      "Return_on_Assets": "21.4226",
      "Net_Profit_Margin_Percentage": "10.7478"
    },
    {
      "display_name": "Home Depot",
      "segment": "Home Improvement",
      "Return_on_Assets": "19.7870",
      "Net_Profit_Margin_Percentage": "9.9188"
    }
  ]
}
```

### 3. Financial Health Analysis

**Query:** Get liquidity ratios for companies
```sql
SELECT c.display_name, c.segment, m.Current_Ratio, m.Quick_Ratio, m.Debt_to_Equity 
FROM financial_metrics m 
JOIN company_info c ON m.company_name = c.company 
WHERE m.year = 2023 AND m.Current_Ratio IS NOT NULL 
ORDER BY m.Current_Ratio DESC 
LIMIT 10
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "rows": [
    {
      "display_name": "Tapestry",
      "segment": "Specialty",
      "Current_Ratio": "5.1435",
      "Quick_Ratio": "4.6617",
      "Debt_to_Equity": "3.6244"
    },
    {
      "display_name": "Dillard's",
      "segment": "Department Store",
      "Current_Ratio": "2.6677",
      "Quick_Ratio": "1.3461",
      "Debt_to_Equity": "1.0323"
    },
    {
      "display_name": "Lululemon",
      "segment": "Specialty",
      "Current_Ratio": "2.4892",
      "Quick_Ratio": "1.6778",
      "Debt_to_Equity": "0.6758"
    }
  ]
}
```

## Search and Filter Examples

### Company Search

**Query:** Search for companies by name
```sql
SELECT display_name, ticker_symbol, segment 
FROM company_info 
WHERE display_name LIKE '%Walmart%'
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "rows": [
    {
      "display_name": "Walmart",
      "ticker_symbol": "WMT",
      "segment": "Discount Store"
    }
  ]
}
```

### Segment Filtering

**Query:** Get all available segments
```sql
SELECT DISTINCT segment 
FROM company_info 
WHERE segment IS NOT NULL 
ORDER BY segment
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "rows": [
    {"segment": "Department Store"},
    {"segment": "Discount Store"},
    {"segment": "Fast Fashion"},
    {"segment": "Grocery"},
    {"segment": "Health & Pharmacy"},
    {"segment": "Home Improvement"},
    {"segment": "Off Price"},
    {"segment": "Online"},
    {"segment": "Specialty"},
    {"segment": "Warehouse Clubs"}
  ]
}
```

**Query:** Get all subsegments
```sql
SELECT DISTINCT subsegment 
FROM company_info 
WHERE subsegment IS NOT NULL 
ORDER BY subsegment 
LIMIT 5
```

**Response Example:**
```json
{
  "query_execution_status": "Success",
  "rows": [
    {"subsegment": "Accessories and Shoes"},
    {"subsegment": "Apparel"},
    {"subsegment": "Beauty"},
    {"subsegment": "Category Killer"},
    {"subsegment": "Home"}
  ]
}
```

## Error Handling

If a query fails, you'll receive an error response:

```json
{
  "query_execution_status": "Error",
  "query_execution_message": "Error message describing what went wrong",
  "schema": null,
  "rows": null
}
```

## Best Practices

1. **Clean Queries**: Use the readable SQL format shown above - let your client handle URL encoding
2. **Error Handling**: Always check the `query_execution_status` field before processing results
3. **Filtering**: Use `WHERE` clauses to limit data retrieval and improve performance
4. **Pagination**: Use `LIMIT` and `OFFSET` for large result sets
5. **Caching**: Consider caching responses as benchmark data doesn't change frequently

## JavaScript/TypeScript Helper Function

Here's a helper function for building API URLs that handles encoding automatically:

```javascript
function buildBenchmarkQuery(sqlQuery) {
  const baseUrl = 'https://www.dolthub.com/api/v1alpha1/calvinw/BusMgmtBenchmarks';
  const encodedQuery = encodeURIComponent(sqlQuery);
  return `${baseUrl}?q=${encodedQuery}`;
}

// Example usage:
const url = buildBenchmarkQuery("SELECT * FROM company_info WHERE segment = 'Grocery'");

// Fetch data
fetch(url)
  .then(response => response.json())
  .then(data => {
    if (data.query_execution_status === 'Success') {
      console.log('Data:', data.rows);
    } else {
      console.error('Query failed:', data.query_execution_message);
    }
  });
```

## Common Query Patterns

### Dashboard Widgets

**Revenue Summary Widget:**
```sql
SELECT company, `Net Revenue`, `Gross Margin %`, `Operating Profit Margin %` 
FROM `benchmarks 2023 view` 
WHERE company = 'Walmart'
```

**Segment Performance Widget:**
```sql
SELECT segment, Operating_Profit_Margin_Percentage, Return_on_Assets 
FROM segment_metrics 
WHERE year = 2023 
ORDER BY Return_on_Assets DESC 
LIMIT 5
```

### Benchmarking Analysis

**Company vs Segment Benchmark:**
```sql
SELECT 'Company' as type, c.display_name as name, m.Return_on_Assets, m.Operating_Profit_Margin_Percentage
FROM financial_metrics m 
JOIN company_info c ON m.company_name = c.company 
WHERE c.display_name = 'Walmart' AND m.year = 2023
UNION ALL
SELECT 'Segment Benchmark' as type, s.segment as name, s.Return_on_Assets, s.Operating_Profit_Margin_Percentage
FROM segment_metrics s 
WHERE s.segment = 'Discount Store' AND s.year = 2023
```

This comprehensive documentation provides real examples from your database, showing exactly what developers can expect when working with the BusMgmtBenchmarks API. The response format is consistent and includes all the metadata fields that help with debugging and understanding the data structure.
