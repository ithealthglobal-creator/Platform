"""LangChain tools the Dashboard Generator agent uses to inspect platform data
and emit chart specs the frontend renders.

Tools are bound to the caller's company_id so cross-tenant data cannot leak.
The frontend listens for tool_end events on these tools and applies the chart
spec to the canvas — no custom-event channel is required.
"""
import json
import uuid
from langchain_core.tools import tool
from services.supabase_client import get_supabase_admin
from tools.dashboard_allowlist import (
    DASHBOARD_ALLOWLIST,
    VALID_AGGREGATIONS,
    VALID_TIME_GRAINS,
    VALID_FILTER_OPS,
    is_allowed_field,
)


VALID_CHART_TYPES = {"bar", "line", "area", "pie", "radial", "radar"}


def _validate_query_spec(spec: dict, company_id: str) -> tuple[bool, str | None, dict | None]:
    """Validate a QuerySpec against the allowlist. Returns (ok, error, normalized_spec)."""
    if not isinstance(spec, dict):
        return False, "spec must be a dict", None

    entity = spec.get("entity")
    entity_def = DASHBOARD_ALLOWLIST.get(entity)
    if not entity_def:
        return False, f"entity '{entity}' is not in the allowlist", None

    dimensions = spec.get("dimensions") or []
    for d in dimensions:
        if not is_allowed_field(entity, d):
            return False, f"dimension '{d}' not allowed on {entity}", None

    measures = spec.get("measures") or []
    if not measures:
        return False, "at least one measure is required", None
    for m in measures:
        agg = (m or {}).get("agg")
        if agg not in VALID_AGGREGATIONS:
            return False, f"measure agg '{agg}' invalid", None
        field = (m or {}).get("field")
        if agg != "count" and field and not is_allowed_field(entity, field):
            return False, f"measure field '{field}' not allowed on {entity}", None

    filters = spec.get("filters") or []
    for f in filters:
        if (f or {}).get("op") not in VALID_FILTER_OPS:
            return False, f"filter op '{(f or {}).get('op')}' invalid", None
        if not is_allowed_field(entity, (f or {}).get("field", "")):
            return False, f"filter field '{(f or {}).get('field')}' not allowed", None

    if spec.get("time_grain") and spec["time_grain"] not in VALID_TIME_GRAINS:
        return False, f"time_grain '{spec['time_grain']}' invalid", None

    # Auto-inject company_id filter if entity is company-scoped.
    if entity_def.get("scoped_by_company") and company_id:
        filters = list(filters)
        if not any((f or {}).get("field") == "company_id" for f in filters):
            filters.append({"field": "company_id", "op": "=", "value": company_id})

    normalized = {
        "source": spec.get("source") or "data",
        "entity": entity,
        "dimensions": dimensions,
        "measures": measures,
        "filters": filters,
        "time_field": spec.get("time_field"),
        "time_grain": spec.get("time_grain"),
        "order_by": spec.get("order_by"),
        "limit": spec.get("limit") or 1000,
    }
    return True, None, normalized


def _execute_query(spec: dict) -> list[dict]:
    """Run a normalized QuerySpec against Supabase and group/aggregate in Python.

    The PostgREST client cannot do GROUP BY directly, so we fetch the necessary
    columns under filters/limit and aggregate in memory. Limit defaults to 1000
    rows of raw data.
    """
    client = get_supabase_admin()
    entity = spec["entity"]

    select_cols = set()
    select_cols.update(spec.get("dimensions") or [])
    for m in spec.get("measures") or []:
        if m.get("field"):
            select_cols.add(m["field"])
    if spec.get("time_field"):
        select_cols.add(spec["time_field"])
    if not select_cols:
        select_cols.add("id")

    q = client.table(entity).select(",".join(sorted(select_cols)))
    for f in spec.get("filters") or []:
        op = f["op"]
        field = f["field"]
        value = f["value"]
        if op == "=":
            q = q.eq(field, value)
        elif op == "!=":
            q = q.neq(field, value)
        elif op == ">":
            q = q.gt(field, value)
        elif op == "<":
            q = q.lt(field, value)
        elif op == ">=":
            q = q.gte(field, value)
        elif op == "<=":
            q = q.lte(field, value)
        elif op == "in" and isinstance(value, list):
            q = q.in_(field, value)

    q = q.limit(int(spec.get("limit") or 1000))
    raw = q.execute().data or []

    grain = spec.get("time_grain")
    time_field = spec.get("time_field")

    def _bucket(row: dict) -> tuple:
        key = []
        for d in spec.get("dimensions") or []:
            v = row.get(d)
            if d == time_field and grain and v:
                v = _truncate_time(str(v), grain)
            key.append(v)
        return tuple(key)

    buckets: dict[tuple, list[dict]] = {}
    for row in raw:
        buckets.setdefault(_bucket(row), []).append(row)

    out: list[dict] = []
    for key, rows in buckets.items():
        bucket_row: dict = {}
        for d, k in zip(spec.get("dimensions") or [], key):
            bucket_row[d] = k
        for m in spec.get("measures") or []:
            label = m.get("label") or f"{m['agg']}_{m.get('field') or 'rows'}"
            agg = m["agg"]
            field = m.get("field")
            if agg == "count":
                bucket_row[label] = len(rows)
            else:
                values = [r.get(field) for r in rows if r.get(field) is not None]
                if not values:
                    bucket_row[label] = 0
                elif agg == "sum":
                    bucket_row[label] = sum(values)
                elif agg == "avg":
                    bucket_row[label] = sum(values) / len(values)
                elif agg == "min":
                    bucket_row[label] = min(values)
                elif agg == "max":
                    bucket_row[label] = max(values)
        out.append(bucket_row)

    order_by = spec.get("order_by")
    if order_by and order_by.get("field"):
        reverse = order_by.get("dir") == "desc"
        out.sort(key=lambda r: (r.get(order_by["field"]) is None, r.get(order_by["field"])), reverse=reverse)

    return out


def _truncate_time(iso: str, grain: str) -> str:
    """Truncate an ISO timestamp to a coarser grain for bucketing."""
    s = iso[:10]  # YYYY-MM-DD
    if grain == "day":
        return s
    if grain == "month":
        return s[:7] + "-01"
    if grain == "year":
        return s[:4] + "-01-01"
    if grain == "quarter":
        year = int(s[:4])
        month = int(s[5:7])
        q_start = ((month - 1) // 3) * 3 + 1
        return f"{year:04d}-{q_start:02d}-01"
    if grain == "week":
        # ISO week start (Monday) — approximate by truncating to day.
        from datetime import date, timedelta
        y, m, d = int(s[:4]), int(s[5:7]), int(s[8:10])
        dt = date(y, m, d)
        dt -= timedelta(days=dt.weekday())
        return dt.isoformat()
    return s


def build_dashboard_tools(company_id: str, tool_names: list[str]) -> list:
    """Build the dashboard tool set scoped to a company."""

    @tool
    def dashboard_list_entities() -> str:
        """List the platform tables you can chart, with their dimensions and measurable columns.

        Always call this first when the user asks for a chart so you know what's available.
        Returns JSON: {entity_name: {label, dimensions, measurable, default_time_field}}.
        """
        return json.dumps(
            {
                k: {
                    "label": v["label"],
                    "dimensions": v["dimensions"],
                    "measurable": v["measurable"],
                    "default_time_field": v.get("default_time_field"),
                }
                for k, v in DASHBOARD_ALLOWLIST.items()
            }
        )

    @tool
    def dashboard_query(spec: dict) -> str:
        """Run a structured aggregation query against an allowlisted table.

        Args:
            spec: A QuerySpec dict with keys:
              - entity (str, required): table name from dashboard_list_entities
              - dimensions (list[str]): group-by columns (allowed columns only)
              - measures (list[{agg, field?, label}]): aggregations.
                agg in {count, sum, avg, min, max}. label is the output key.
              - filters (list[{field, op, value}], optional)
              - time_field (str, optional), time_grain in {day,week,month,quarter,year}
              - order_by ({field, dir}), limit (int, default 1000)

        Returns JSON: { ok, rows | error }. Rows is the aggregated output.
        Use this to preview the data before proposing a chart.
        """
        ok, err, normalized = _validate_query_spec(spec, company_id)
        if not ok:
            return json.dumps({"ok": False, "error": err})
        try:
            rows = _execute_query(normalized)
        except Exception as e:
            return json.dumps({"ok": False, "error": f"query failed: {str(e)[:200]}"})
        return json.dumps({"ok": True, "rows": rows[:200], "row_count": len(rows)})

    @tool
    def dashboard_propose_chart(
        title: str,
        chart_type: str,
        query: dict,
        config: dict | None = None,
        description: str | None = None,
    ) -> str:
        """Add a new chart to the user's canvas.

        Args:
            title: Short chart title (max ~60 chars).
            chart_type: One of bar, line, area, pie, radial, radar.
            query: A QuerySpec dict (same shape as dashboard_query).
            config: Optional shadcn chart config: {<measure_label>: {label, color}}.
            description: Optional one-line caption.

        Returns JSON: { ok, chart } where chart is the full ChartSpec the
        frontend will render. The frontend listens for this tool's output and
        appends the chart to the active dashboard.
        """
        if chart_type not in VALID_CHART_TYPES:
            return json.dumps({"ok": False, "error": f"chart_type '{chart_type}' invalid"})
        ok, err, normalized = _validate_query_spec(query, company_id)
        if not ok:
            return json.dumps({"ok": False, "error": err})

        chart_id = str(uuid.uuid4())
        spec = {
            "id": chart_id,
            "title": title,
            "description": description,
            "chart_type": chart_type,
            "query": normalized,
            "config": config or {},
            "layout": {"x": 0, "y": 0, "w": 6, "h": 4},
        }
        return json.dumps({"ok": True, "chart": spec})

    @tool
    def dashboard_update_chart(chart_id: str, patch: dict) -> str:
        """Update an existing chart on the canvas.

        Args:
            chart_id: The id of the chart to update (the user must have selected it).
            patch: Partial ChartSpec — any of title, description, chart_type, query, config.
                If query is present it is re-validated against the allowlist.

        Returns JSON: { ok, chart_id, patch } — the frontend merges the patch
        into the chart with the matching id.
        """
        if not chart_id:
            return json.dumps({"ok": False, "error": "chart_id is required"})
        if "chart_type" in patch and patch["chart_type"] not in VALID_CHART_TYPES:
            return json.dumps({"ok": False, "error": f"chart_type '{patch['chart_type']}' invalid"})
        if "query" in patch:
            ok, err, normalized = _validate_query_spec(patch["query"], company_id)
            if not ok:
                return json.dumps({"ok": False, "error": err})
            patch = {**patch, "query": normalized}
        return json.dumps({"ok": True, "chart_id": chart_id, "patch": patch})

    @tool
    def dashboard_remove_chart(chart_id: str) -> str:
        """Remove a chart from the canvas.

        Args:
            chart_id: The id of the chart to remove.

        Returns JSON: { ok, chart_id, removed: true }.
        """
        if not chart_id:
            return json.dumps({"ok": False, "error": "chart_id is required"})
        return json.dumps({"ok": True, "chart_id": chart_id, "removed": True})

    builders = {
        "dashboard_list_entities": dashboard_list_entities,
        "dashboard_query": dashboard_query,
        "dashboard_propose_chart": dashboard_propose_chart,
        "dashboard_update_chart": dashboard_update_chart,
        "dashboard_remove_chart": dashboard_remove_chart,
    }
    return [builders[name] for name in tool_names if name in builders]
