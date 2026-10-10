"""pedidos para llevar / delivery y pizzas mitad y mitad

Revision ID: a7c1f0e2b3d4
Revises: 9340261c34e5
Create Date: 2026-10-10 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7c1f0e2b3d4'
down_revision: Union[str, None] = '9340261c34e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

order_type = sa.Enum('dine_in', 'takeaway', 'delivery', name='order_type')


def upgrade() -> None:
    order_type.create(op.get_bind(), checkfirst=True)

    op.add_column('orders', sa.Column('order_type', order_type, nullable=False, server_default='dine_in'))
    op.add_column('orders', sa.Column('customer_name', sa.String(length=100), nullable=True))
    op.add_column('orders', sa.Column('customer_phone', sa.String(length=30), nullable=True))
    op.add_column('orders', sa.Column('delivery_address', sa.String(length=255), nullable=True))
    op.add_column('orders', sa.Column('delivery_fee', sa.Numeric(10, 2), nullable=False, server_default='0'))
    op.alter_column('orders', 'table_id', existing_type=sa.Integer(), nullable=True)

    op.add_column('order_items', sa.Column('half_menu_item_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'order_items_half_menu_item_id_fkey', 'order_items', 'menu_items',
        ['half_menu_item_id'], ['id'],
    )

    op.add_column('menu_categories', sa.Column('allows_halves', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('payments', sa.Column('delivery_fee', sa.Numeric(10, 2), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('payments', 'delivery_fee')
    op.drop_column('menu_categories', 'allows_halves')
    op.drop_constraint('order_items_half_menu_item_id_fkey', 'order_items', type_='foreignkey')
    op.drop_column('order_items', 'half_menu_item_id')
    op.alter_column('orders', 'table_id', existing_type=sa.Integer(), nullable=False)
    op.drop_column('orders', 'delivery_fee')
    op.drop_column('orders', 'delivery_address')
    op.drop_column('orders', 'customer_phone')
    op.drop_column('orders', 'customer_name')
    op.drop_column('orders', 'order_type')
    order_type.drop(op.get_bind(), checkfirst=True)
