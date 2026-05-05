"""Curated allowlist of platform tables the Dashboard Generator can chart.

Mirrors src/lib/dashboard/allowlist.ts on the frontend. Server-side is the source
of truth — the client copy is a convenience for labels/validation.
"""

DASHBOARD_ALLOWLIST: dict[str, dict] = {
    "services": {
        "label": "Services",
        "dimensions": ["phase_id", "status", "created_at"],
        "measurable": ["id"],
        "default_time_field": "created_at",
        "scoped_by_company": False,
    },
    "service_requests": {
        "label": "Service requests",
        "dimensions": ["service_id", "status", "company_id", "created_at"],
        "measurable": ["id"],
        "default_time_field": "created_at",
        "scoped_by_company": True,
    },
    "orders": {
        "label": "Orders",
        "dimensions": ["status", "company_id", "created_at"],
        "measurable": ["id", "total_amount"],
        "default_time_field": "created_at",
        "scoped_by_company": True,
    },
    "order_items": {
        "label": "Order items",
        "dimensions": ["order_id", "service_id", "created_at"],
        "measurable": ["id", "unit_price", "quantity"],
        "default_time_field": "created_at",
        "scoped_by_company": False,
    },
    "customer_contracts": {
        "label": "Customer contracts",
        "dimensions": ["status", "company_id", "service_id", "created_at"],
        "measurable": ["id", "monthly_amount"],
        "default_time_field": "created_at",
        "scoped_by_company": True,
    },
    "companies": {
        "label": "Companies",
        "dimensions": ["type", "status", "parent_company_id", "created_at"],
        "measurable": ["id"],
        "default_time_field": "created_at",
        "scoped_by_company": False,
    },
    "profiles": {
        "label": "Profiles",
        "dimensions": ["role", "company_id", "is_active", "created_at"],
        "measurable": ["id"],
        "default_time_field": "created_at",
        "scoped_by_company": True,
    },
    "support_tickets": {
        "label": "Support tickets",
        "dimensions": ["status", "priority", "company_id", "assigned_to", "created_at"],
        "measurable": ["id"],
        "default_time_field": "created_at",
        "scoped_by_company": True,
    },
    "ticket_replies": {
        "label": "Ticket replies",
        "dimensions": ["ticket_id", "role", "created_at"],
        "measurable": ["id"],
        "default_time_field": "created_at",
        "scoped_by_company": False,
    },
    "assessment_attempts": {
        "label": "Assessment attempts",
        "dimensions": ["user_id", "assessment_id", "status", "created_at"],
        "measurable": ["id", "score"],
        "default_time_field": "created_at",
        "scoped_by_company": False,
    },
    "user_course_enrollments": {
        "label": "Course enrollments",
        "dimensions": ["course_id", "user_id", "status", "created_at"],
        "measurable": ["id"],
        "default_time_field": "created_at",
        "scoped_by_company": False,
    },
    "certificates": {
        "label": "Certificates",
        "dimensions": ["user_id", "course_id", "created_at"],
        "measurable": ["id"],
        "default_time_field": "created_at",
        "scoped_by_company": False,
    },
    "ai_conversations": {
        "label": "AI conversations",
        "dimensions": ["user_id", "agent_id", "is_active", "created_at"],
        "measurable": ["id"],
        "default_time_field": "created_at",
        "scoped_by_company": False,
    },
    "ai_execution_runs": {
        "label": "AI runs",
        "dimensions": ["conversation_id", "status", "started_at"],
        "measurable": ["id"],
        "default_time_field": "started_at",
        "scoped_by_company": False,
    },
    "meta_campaigns": {
        "label": "Meta campaigns",
        "dimensions": ["status", "objective", "company_id", "created_at"],
        "measurable": ["id", "spend"],
        "default_time_field": "created_at",
        "scoped_by_company": True,
    },
    "meta_ads": {
        "label": "Meta ads",
        "dimensions": ["status", "ad_set_id", "company_id", "created_at"],
        "measurable": ["id", "impressions", "clicks", "spend"],
        "default_time_field": "created_at",
        "scoped_by_company": True,
    },
    "blog_posts": {
        "label": "Blog posts",
        "dimensions": ["status", "author_id", "published_at", "created_at"],
        "measurable": ["id"],
        "default_time_field": "created_at",
        "scoped_by_company": False,
    },
    "knowledge_documents": {
        "label": "Knowledge documents",
        "dimensions": ["folder_id", "company_id", "created_at", "last_ingested_at"],
        "measurable": ["id"],
        "default_time_field": "created_at",
        "scoped_by_company": True,
    },
    "knowledge_chunks": {
        "label": "Knowledge chunks",
        "dimensions": ["document_id", "company_id", "created_at"],
        "measurable": ["id"],
        "default_time_field": "created_at",
        "scoped_by_company": True,
    },
}

VALID_AGGREGATIONS = {"count", "sum", "avg", "min", "max"}
VALID_TIME_GRAINS = {"day", "week", "month", "quarter", "year"}
VALID_FILTER_OPS = {"=", "!=", ">", "<", ">=", "<=", "in"}


def is_allowed_field(entity: str, field: str) -> bool:
    spec = DASHBOARD_ALLOWLIST.get(entity)
    if not spec:
        return False
    return (
        field in spec["dimensions"]
        or field in spec["measurable"]
        or field == spec.get("default_time_field")
    )
