"""Add quiz time limit

Revision ID: c85ce05f9c01
Revises: 31347be97122
"""

from alembic import op
import sqlalchemy as sa

revision = "c85ce05f9c01"
down_revision = "31347be97122"
branch_labels = None
depends_on = None

def upgrade():
op.add_column(
"quizzes",
sa.Column(
"time_limit_minutes",
sa.Integer(),
nullable=False,
server_default="30",
),
)
def downgrade():
op.drop_column("quizzes", "time_limit_minutes")
