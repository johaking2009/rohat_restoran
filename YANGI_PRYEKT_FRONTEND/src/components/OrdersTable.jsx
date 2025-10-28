import { Table } from "antd";
import { useState } from "react";

const OrdersTable = ({ orders = [] }) => {
  const [showAll, setShowAll] = useState(false);

  const columns = [
    { title: "№", dataIndex: "daily_order_number", key: "number" },
    { title: "Sana", dataIndex: "order_date", key: "date" },
    { title: "Stol", dataIndex: "table_number", key: "table" },
    { title: "Waiter", dataIndex: "waiter_name", key: "waiter" },
    { title: "Summa", dataIndex: "final_total", key: "total" },
    { title: "Holat", dataIndex: "status", key: "status" },
    // Mahsulotlar column: when an order has exactly one product and table is expanded,
    // show 'zakaslar' instead of 'bitta mahsulot' as requested.
    {
      title: "Mahsulot",
      key: "products",
      render: (_, record) => {
        const count = Array.isArray(record.items) ? record.items.length : 0;
        if (count === 1) return showAll ? "zakaslar" : "bitta mahsulot";
        return `${count} ta`;
      },
    },
  ];

  // Show only first 10 orders when collapsed
  const visibleOrders = showAll ? orders : orders.slice(0, 10);

  return (
    <div>
      <Table dataSource={visibleOrders} columns={columns} rowKey="_id" pagination={false} />

      {orders.length > 10 && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button
            onClick={() => setShowAll((s) => !s)}
            style={{
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: 4,
              border: "1px solid #d9d9d9",
              background: "white",
            }}
            aria-expanded={showAll}
          >
            {showAll ? (
              <>
                Kamroq <span style={{ marginLeft: 8 }}>▲</span>
              </>
            ) : (
              <>
                Ko'proq <span style={{ marginLeft: 8 }}>▼</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default OrdersTable;
