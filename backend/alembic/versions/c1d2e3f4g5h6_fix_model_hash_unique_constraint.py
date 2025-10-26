"""fix model hash unique constraint

Revision ID: c1d2e3f4g5h6
Revises: a19b8135e96c
Create Date: 2025-10-26 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c1d2e3f4g5h6'
down_revision = 'a19b8135e96c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove the unique constraint on model_hash alone
    op.drop_index('ix_model_registry_model_hash', table_name='model_registry')
    
    # Create a non-unique index on model_hash for query performance
    op.create_index('ix_model_registry_model_hash', 'model_registry', ['model_hash'], unique=False)
    
    # Add composite unique constraint on (owner_id, name) to prevent duplicate names per user
    # This allows different users to have models with the same name
    op.create_index('ix_model_registry_owner_name_unique', 'model_registry', ['owner_id', 'name'], unique=True)


def downgrade() -> None:
    # Remove the composite unique constraint
    op.drop_index('ix_model_registry_owner_name_unique', table_name='model_registry')
    
    # Restore the unique constraint on model_hash
    op.drop_index('ix_model_registry_model_hash', table_name='model_registry')
    op.create_index('ix_model_registry_model_hash', 'model_registry', ['model_hash'], unique=True)
