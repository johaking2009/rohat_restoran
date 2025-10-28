import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  Col,
  Row,
  Button,
  Space,
  message,
  Statistic,
  Table,
  Pagination,
  Select,
  Tag,
  Progress,
  Tooltip,
  Avatar,
  Divider,
  Badge,
  Modal,
  Checkbox,
  Popover,
} from "antd";
import {
  DollarOutlined,
  CreditCardOutlined,
  ShoppingCartOutlined,
  PercentageOutlined,
  WalletOutlined,
  UserOutlined,
  ReloadOutlined,
  FilterOutlined,
  CalendarOutlined,
  RiseOutlined,
  FallOutlined,
  EyeOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import API from "../services/api";
import moment from "moment";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [period, setPeriod] = useState("daily");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [startDate, setStartDate] = useState(null); // ✅ Alohida startDate
  const [endDate, setEndDate] = useState(null); // ✅ Alohida endDate
  const [activeTab, setActiveTab] = useState("overview");
  const [branch, setBranch] = useState("1");
  const [activeQuickFilter, setActiveQuickFilter] = useState(null);

  const [processedStats, setProcessedStats] = useState({
    totalOrders: 0,
    totalIncome: 0,
    totalCash: 0,
    totalCard: 0,
    totalClick: 0,
    totalServiceAmount: 0,
    averageOrderValue: 0,
    growthRate: 0,
  });
  const [waiterStats, setWaiterStats] = useState([]);
  const [allSoldItems, setAllSoldItems] = useState([]);
  const [popularDishes, setPopularDishes] = useState([]);
  // Product selection modal state
  const [productSelectModalVisible, setProductSelectModalVisible] = useState(false);
  const [selectedProductKeys, setSelectedProductKeys] = useState(new Set());
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [appliedCategories, setAppliedCategories] = useState(new Set());
  // Modal for waiter products
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [modalWaiterName, setModalWaiterName] = useState(null);
  // Will store orders (not aggregated products) for the selected waiter
  const [modalOrders, setModalOrders] = useState([]);
  const [modalShowAllOrders, setModalShowAllOrders] = useState(false);
  // Modal-specific filters and pagination
  const [modalQuickFilter, setModalQuickFilter] = useState(null);
  const [modalStartDate, setModalStartDate] = useState(null);
  const [modalEndDate, setModalEndDate] = useState(null);
  const [modalPage, setModalPage] = useState(1);
  const [modalPageSize, setModalPageSize] = useState(8);

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    message.success("Chiqdingiz ✅");
    navigate("/login", { replace: true });
  };

  // ✅ TEZ TUGMALAR FUNKSIYASI
  const handleQuickFilter = useCallback((days, label) => {
    const end = moment().endOf("day");
    const start = moment().subtract(days, "days").startOf("day");

    setStartDate(start.toDate()); // ✅ Date object
    setEndDate(end.toDate());
    setActiveQuickFilter(label);
    setPeriod(null);

    console.log(
      `Tez filtr: ${label} — Start: ${start.format(
        "YYYY-MM-DD"
      )}, End: ${end.format("YYYY-MM-DD")}`
    ); // Debug
    message.success(`${label} tanlandi`);
  }, []);

  // ✅ SANA BO'YICHA FILTR FUNKSIYASI
  const applyDateRangeFilter = useCallback((start, end) => {
    setStartDate(start);
    setEndDate(end);
    setActiveQuickFilter(null);
    setPeriod(null);
    console.log(
      `Custom filtr: Start: ${moment(start).format(
        "YYYY-MM-DD"
      )}, End: ${moment(end).format("YYYY-MM-DD")}`
    ); // Debug
    message.info(
      `Sana oralig'i: ${moment(start).format("DD.MM.YYYY")} - ${moment(
        end
      ).format("DD.MM.YYYY")}`
    );
  }, []);

  const fetchOrders = useCallback(
    async (selectedBranch = branch) => {
      const startTime = Date.now();
      setLoading(true);

      // Try up to 2 attempts in case of transient network errors
      try {
        const params = { limit: 2000, page: 1 };
        const url = `/orders/branch/${selectedBranch}`;
        console.log("🚀 So'rov boshlandi:", url, params);

        let res = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            res = await API.get(url, { params });
            break; // success
          } catch (e) {
            console.warn(`So'rov xatosi (urinish ${attempt}):`, e.message || e);
            if (attempt === 2) throw e; // rethrow after last attempt
            // small delay before retry
            await new Promise((r) => setTimeout(r, 700));
          }
        }

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        // Normalize response: backend may return array or { items: [...], Count }
        let data = [];
        if (Array.isArray(res.data)) data = res.data;
        else if (res.data?.items && Array.isArray(res.data.items)) data = res.data.items;
        else if (res.data?.data && Array.isArray(res.data.data)) data = res.data.data;
        else data = [];

        const count = data.length || res.data?.Count || 0;

        console.log(`✅ Javob keldi: ${duration} sekund, ${count} ta buyurtma`);

        setOrders(data);
        message.success(
          `${selectedBranch}-filial ma'lumotlari yangilandi (${duration.toFixed(1)}s, ${count} ta buyurtma)`
        );
      } catch (err) {
        console.error("❌ Xato:", err);

        // Prefer backend-provided message when available
        const serverMsg = err?.response?.data?.message || err?.response?.data || err?.message;
        const userMsg = serverMsg ? `Ma'lumotlarni olishda xato: ${serverMsg}` : "Ma'lumotlarni olishda xato";
        message.error(userMsg);
      } finally {
        setLoading(false);
      }
    },
    [branch]
  );

  // ✅ Faqat branch o'zgarganda yoki initial yuklashda fetch qilamiz
  useEffect(() => {
    fetchOrders();
  }, [branch]);

  const filteredOrdersByPeriod = useMemo(() => {
    if (!orders.length) return [];

    let filtered = orders;

    // ✅ Har doim frontendda filtrlaymiz
    if (startDate && endDate) {
      const start = moment(startDate).startOf("day");
      const end = moment(endDate).endOf("day");
      filtered = filtered.filter((order) => {
        const orderDate = moment(order.createdAt || order.order_date);
        const isBetween = orderDate.isBetween(start, end, null, "[]");
        if (!isBetween) {
          console.log(
            `Filtrdan o'tmadi: ${order._id}, sana: ${orderDate.format(
              "YYYY-MM-DD"
            )}`
          ); // Debug
        }
        return isBetween;
      });
      console.log(
        `Filtrlangan buyurtmalar (sana ${start.format("DD.MM")} - ${end.format(
          "DD.MM"
        )}): ${filtered.length} ta (jami: ${orders.length})`
      );
    }
    // ✅ Agar sana yo'q bo'lsa, period bo'yicha filterlash
    else if (period) {
      const now = moment();
      let startDateMoment;

      switch (period) {
        case "daily":
          startDateMoment = now.clone().startOf("day");
          break;
        case "monthly":
          startDateMoment = now.clone().startOf("month");
          break;
        case "yearly":
          startDateMoment = now.clone().startOf("year");
          break;
        default:
          startDateMoment = now.clone().startOf("day");
      }

      filtered = filtered.filter((order) => {
        const orderDate = moment(order.createdAt || order.order_date);
        return orderDate.isAfter(startDateMoment);
      });
      console.log(
        `Filtrlangan buyurtmalar (period ${period}): ${filtered.length} ta`
      );
    }

    return filtered;
  }, [orders, period, startDate, endDate]);

  useEffect(() => {
    // Fallback: agar period/sana bo'yicha filtr bilan hech narsa topilmasa,
    // umumiy `orders` massivini ishlatamiz — shunda API ma'lumot kelsa sahifa raqamlarni ko'rsatadi.
    const ordersToProcess = filteredOrdersByPeriod.length
      ? filteredOrdersByPeriod
      : orders.length
      ? orders
      : [];

    if (!ordersToProcess.length) {
      setProcessedStats({
        totalOrders: 0,
        totalIncome: 0,
        totalCash: 0,
        totalCard: 0,
        totalClick: 0,
        totalServiceAmount: 0,
        averageOrderValue: 0,
        growthRate: 0,
      });
      setWaiterStats([]);
      setAllSoldItems([]);
      setPopularDishes([]);
      console.log("Filtr natijasi: Hech qanday buyurtma topilmadi"); // Debug
      return;
    }

    setProcessing(true);

    setTimeout(() => {
      const processStartTime = Date.now();
  const totalOrders = ordersToProcess.length;
      let totalIncome = 0;
      let totalCash = 0;
      let totalCard = 0;
      let totalClick = 0;
      let totalServiceAmount = 0;
      const waiterStatsMap = {};
      const allItems = [];
      const dishStatsMap = {};

      ordersToProcess.forEach((order) => {
        const orderTotal = order.final_total || order.total_price || 0;
        const serviceAmount = order.service_amount || 0;

        totalIncome += orderTotal;
        totalServiceAmount += serviceAmount;

        if (order.paymentMethod === "cash") {
          totalCash += orderTotal;
        } else if (order.paymentMethod === "card") {
          totalCard += orderTotal;
        } else if (order.paymentMethod === "click") {
          totalClick += orderTotal;
        } else if (order.mixedPaymentDetails) {
          totalCash += order.mixedPaymentDetails.cashAmount || 0;
          totalCard += order.mixedPaymentDetails.cardAmount || 0;
        }

        if (order.waiter_name) {
          if (!waiterStatsMap[order.waiter_name]) {
            waiterStatsMap[order.waiter_name] = {
              name: order.waiter_name,
              orders: 0,
              totalSales: 0,
              monthlyCommission: 0,
            };
          }
          waiterStatsMap[order.waiter_name].orders++;
          waiterStatsMap[order.waiter_name].totalSales += orderTotal;
          waiterStatsMap[order.waiter_name].monthlyCommission += serviceAmount;
        }

        const orderItems = order.items || order.ordered_items || [];
        orderItems.forEach((item) => {
          const qty = item.quantity || 1;
          const price = item.price || item.unit_price || 0;
          const itemName = item.name || item.item_name;

          if (!dishStatsMap[itemName]) {
            dishStatsMap[itemName] = {
              name: itemName,
              category: item.category_name || item.category || "Boshqa",
              sold: 0,
              revenue: 0,
            };
          }
          dishStatsMap[itemName].sold += qty;
          dishStatsMap[itemName].revenue += price * qty;

          allItems.push({
            key: `${order._id}-${item._id || Math.random()}`,
            orderId: order._id || order.id,
            orderNumber: order.daily_order_number || order.order_number,
            date: order.createdAt || order.order_date,
            itemName: itemName,
            category: item.category_name || item.category || "Boshqa",
            quantity: qty,
            price: price,
            subtotal: price * qty,
            waiterName: order.waiter_name,
            tableNumber: order.table_number,
          });
        });
      });

      Object.values(waiterStatsMap).forEach((waiter) => {
        waiter.servicePercentage =
          totalServiceAmount > 0
            ? ((waiter.monthlyCommission / totalServiceAmount) * 100).toFixed(1)
            : 0;
      });

      const averageOrderValue = totalOrders > 0 ? totalIncome / totalOrders : 0;

      // ✅ Growth rate ni custom range uchun 0 qilish
      const growthRate =
        startDate && endDate
          ? 0
          : ((totalOrders / (orders.length - totalOrders || 1)) * 100).toFixed(
              1
            );

      setProcessedStats({
        totalOrders,
        totalIncome,
        totalCash,
        totalCard,
        totalClick,
        totalServiceAmount,
        averageOrderValue,
        growthRate,
      });

      setWaiterStats(
        Object.values(waiterStatsMap)
          .sort((a, b) => b.monthlyCommission - a.monthlyCommission)
          .map((waiter, index) => ({ ...waiter, key: index }))
      );

      setAllSoldItems(
        allItems.sort((a, b) => new Date(b.date) - new Date(a.date))
      );

      setPopularDishes(
        Object.values(dishStatsMap)
          .sort((a, b) => b.sold - a.sold)
          .slice(0, 10)
      );

      const processEndTime = Date.now();
      const processDuration = (processEndTime - processStartTime) / 1000;
      console.log(
        `⚡ Ma'lumotlar qayta ishlandi: ${processDuration.toFixed(
          2
        )} sekund, ${totalOrders} ta buyurtma`
      );

      setProcessing(false);
    }, 50);
  }, [filteredOrdersByPeriod, orders.length, startDate, endDate]);

  const filteredSoldItems = useMemo(() => {
    if (!allSoldItems.length) return [];

    if (filterCategory === "all") {
      return allSoldItems;
    }

    return allSoldItems.filter((item) => item.category === filterCategory);
  }, [allSoldItems, filterCategory]);

  // ✅ AGGREGATED SOLD ITEMS FOR PRODUCTS TAB (yangi qo'shildi)
  const aggregatedSoldItems = useMemo(() => {
    if (!allSoldItems.length) return [];

    const aggregatedMap = {};

    allSoldItems.forEach((item) => {
      const key = `${item.itemName}-${item.category}`;
      if (!aggregatedMap[key]) {
        aggregatedMap[key] = {
          key,
          itemName: item.itemName,
          category: item.category,
          totalQuantity: 0,
          totalRevenue: 0,
          avgPrice: 0,
          orderCount: new Set(),
        };
      }
      aggregatedMap[key].totalQuantity += item.quantity;
      aggregatedMap[key].totalRevenue += item.subtotal;
      aggregatedMap[key].orderCount.add(item.orderId);
      // Avg price ni so'ng hisoblaymiz
    });

    const aggregated = Object.values(aggregatedMap).map((agg) => {
      agg.avgPrice = agg.totalRevenue / agg.totalQuantity;
      agg.orderCount = agg.orderCount.size; // Sonini olish
      return agg;
    });

    // Kategoriya bo'yicha filter
    if (filterCategory !== "all") {
      return aggregated.filter((item) => item.category === filterCategory);
    }

    return aggregated.sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [allSoldItems, filterCategory]);

  // Total revenue across aggregated products (used in Products header)
  const productsTotalRevenue = useMemo(() => {
    if (!aggregatedSoldItems || !aggregatedSoldItems.length) return 0;
    return aggregatedSoldItems.reduce((sum, it) => sum + (it.totalRevenue || 0), 0);
  }, [aggregatedSoldItems]);

  // Totals per category (from aggregatedSoldItems)
  const categoryTotals = useMemo(() => {
    const map = {};
    if (!aggregatedSoldItems || !aggregatedSoldItems.length) return map;
    aggregatedSoldItems.forEach((it) => {
      const cat = it.category || "Boshqa";
      map[cat] = (map[cat] || 0) + (it.totalRevenue || 0);
    });
    return map;
  }, [aggregatedSoldItems]);

  // Combined revenue for currently applied categories (used when multiple categories selected)
  const combinedSelectedRevenue = useMemo(() => {
    if (!appliedCategories || !appliedCategories.size) return 0;
    return [...appliedCategories].reduce((s, c) => s + (categoryTotals[c] || 0), 0);
  }, [appliedCategories, categoryTotals]);

  // Open modal showing products sold by a specific waiter
  const openWaiterProducts = (waiterName) => {
    if (!waiterName) return;

    const nameTrim = waiterName.trim();
    const nameLower = nameTrim.toLowerCase();

    // Use currently filtered orders if a period/date filter is active so modal matches the dashboard
    const sourceOrders = (filteredOrdersByPeriod && filteredOrdersByPeriod.length)
      ? filteredOrdersByPeriod
      : orders;

    // Get only orders for this waiter (case-insensitive match) from the chosen source
    const ordersByWaiter = (sourceOrders || [])
      .filter((o) => (o.waiter_name || "").toString().trim().toLowerCase() === nameLower)
      .map((o) => ({
        key: o._id,
        _id: o._id,
        orderNumber: o.daily_order_number || o.order_number || "-",
        date: o.createdAt || o.order_date,
        tableNumber: o.table_number || o.table_id || "-",
        total: o.final_total || o.total_price || 0,
        items: o.items || o.ordered_items || [],
      }));

    setModalOrders(ordersByWaiter);
    setModalWaiterName(waiterName);
    // reset modal filters & pagination
    setModalShowAllOrders(false);
    setModalQuickFilter(null);
    setModalStartDate(null);
    setModalEndDate(null);
    setModalPage(1);
    setModalPageSize(8);
    setProductModalVisible(true);
  };

  const categories = useMemo(() => {
    if (!allSoldItems.length) return ["all"];
    const uniqueCats = [...new Set(allSoldItems.map((item) => item.category))];
    return ["all", ...uniqueCats.sort()];
  }, [allSoldItems]);

  const ModernStatCard = ({
    title,
    value,
    icon,
    color,
    prefix = "",
    suffix = "",
    growth,
    subtitle,
  }) => (
    <Card
      style={{
        height: "100%",
        borderRadius: "12px",
        background: "#ffffff",
        border: `1px solid ${color}20`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
      bodyStyle={{ padding: "16px" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: "#666",
              fontSize: "13px",
              fontWeight: 500,
              marginBottom: "6px",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: color,
              marginBottom: "4px",
            }}
          >
            {prefix}
            {value?.toLocaleString()}
            {suffix}
          </div>
          {subtitle && (
            <div style={{ fontSize: "11px", color: "#999" }}>{subtitle}</div>
          )}
          {growth !== undefined && growth !== 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "6px",
                fontSize: "11px",
                color: growth > 0 ? "#52c41a" : "#ff4d4f",
              }}
            >
              {growth > 0 ? <RiseOutlined /> : <FallOutlined />}
              <span style={{ marginLeft: "2px" }}>{Math.abs(growth)}%</span>
            </div>
          )}
        </div>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            background: `${color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            color: color,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );

  const waiterColumns = [
    {
      title: "Afitsant",
      dataIndex: "name",
      key: "name",
      render: (name) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Avatar
            size="small"
            icon={<UserOutlined />}
            style={{ backgroundColor: "#7265e6" }}
          />
          <div style={{ fontWeight: "600" }}>{name}</div>
        </div>
      ),
    },
    {
      title: "Buyurtmalar",
      dataIndex: "orders",
      key: "orders",
      render: (orders, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Tag color="blue" style={{ fontSize: "12px" }}>
            {orders}
          </Tag>
          <Button
            size="small"
            type="default"
            onClick={() => openWaiterProducts(record.name)}
          >
            Buyurtmalar
          </Button>
        </div>
      ),
      sorter: (a, b) => a.orders - b.orders,
    },
    {
      title: "Oylik",
      dataIndex: "monthlyCommission",
      key: "monthlyCommission",
      render: (commission, record) => (
        <div>
          <div
            style={{ fontWeight: "bold", color: "#722ed1", fontSize: "14px" }}
          >
            {commission?.toLocaleString()} so'm
          </div>
          <Progress
            percent={Math.min(record.servicePercentage, 100)}
            size="small"
            strokeColor="#722ed1"
            showInfo={false}
          />
        </div>
      ),
      sorter: (a, b) => a.monthlyCommission - b.monthlyCommission,
    },
  ];

  // ✅ YANGI AGGREGATED COLUMNS FOR PRODUCTS TAB
  const aggregatedSoldItemsColumns = [
    {
      title: "Taom",
      dataIndex: "itemName",
      key: "itemName",
      width: 200,
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: "600", fontSize: "13px" }}>{name}</div>
          <Tag color="geekblue" style={{ fontSize: "9px", marginTop: "2px" }}>
            {record.category}
          </Tag>
        </div>
      ),
      sorter: (a, b) => a.itemName.localeCompare(b.itemName),
    },
    {
      title: "Umumiy Miqdor",
      dataIndex: "totalQuantity",
      key: "totalQuantity",
      width: 100,
      render: (qty) => (
        <Tag color="green" style={{ fontSize: "11px" }}>
          {qty}
        </Tag>
      ),
      sorter: (a, b) => a.totalQuantity - b.totalQuantity,
    },
    {
      title: "O'rtacha Narx",
      dataIndex: "avgPrice",
      key: "avgPrice",
      width: 120,
      render: (price) => (
        <div style={{ fontWeight: "500", fontSize: "12px" }}>
          {Math.round(price)?.toLocaleString()} so'm
        </div>
      ),
      sorter: (a, b) => a.avgPrice - b.avgPrice,
    },
    {
      title: "Umumiy Daromad",
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      width: 120,
      render: (revenue) => (
        <div style={{ fontWeight: "bold", color: "#1890ff", fontSize: "12px" }}>
          {revenue?.toLocaleString()} so'm
        </div>
      ),
      sorter: (a, b) => a.totalRevenue - b.totalRevenue,
    },
    {
      title: "Buyurtma Soni",
      dataIndex: "orderCount",
      key: "orderCount",
      width: 100,
      render: (count) => (
        <Tag color="blue" style={{ fontSize: "11px" }}>
          {count} ta
        </Tag>
      ),
      sorter: (a, b) => a.orderCount - b.orderCount,
    },
  ];

  const periodLabels = {
    daily: "Bugungi",
    monthly: "Oylik",
    yearly: "Yillik",
  };

  // ✅ Header uchun label
  const headerLabel = useMemo(() => {
    if (startDate && endDate) {
      return `Hisobot • ${moment(startDate).format("DD.MM.YYYY")} - ${moment(
        endDate
      ).format("DD.MM.YYYY")}`;
    } else {
      return `${periodLabels[period] || "Bugungi"} hisobot • ${moment().format(
        "DD.MM.YYYY"
      )}`;
    }
  }, [startDate, endDate, period]);

  if (loading && !orders.length) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <div style={{ textAlign: "center", color: "white" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🍽️</div>
          <h2 style={{ color: "white", marginBottom: "8px" }}>ROXAT Restoran</h2>
          <p>Ma'lumotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        background: "#f8f9fa",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "20px",
          color: "white",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "bold" }}>
            ROXAT
          </h1>
          <p style={{ margin: "4px 0 0 0", opacity: 0.9, fontSize: "14px" }}>
            {headerLabel}
            {processing && <span> • ⚡ Hisoblanyapti...</span>}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "end",
            alignItems: "center",
            gap: "22px",
          }}
        >
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => fetchOrders()}
            loading={loading}
            size="middle"
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "8px",
              fontWeight: "600",
            }}
          >
            Yangilash
          </Button>

          <Space>
            <Select
              value={branch}
              onChange={(val) => {
                setBranch(val);
              }}
              style={{ width: 160 }}
              loading={loading}
            >
              <Select.Option value="1">1-filial</Select.Option>
              <Select.Option value="2">2-filial</Select.Option>
              {/* <Select.Option value="3">To'raqo'rg'on-filial</Select.Option> */}
            </Select>
          </Space>
   

          <Button
            type="default"
            danger
            onClick={handleLogout}
            style={{
              fontWeight: "600",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.4)",
            }}
          >
            Chiqish
          </Button>
        </div>

        <Divider
          style={{ background: "rgba(255,255,255,0.2)", margin: "12px 0" }}
        />
      </div>

      {/* Tab Navigatsiya */}
      <Card
        style={{
          marginBottom: "20px",
          borderRadius: "12px",
          border: "none",
          boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        }}
        bodyStyle={{ padding: "6px" }}
      >
        <div style={{ display: "flex", gap: "4px" }}>
          {[
            { key: "overview", label: "Hisobot", icon: <BarChartOutlined /> },
            { key: "waiters", label: "Ofitsiant", icon: <UserOutlined /> },
            {
              key: "products",
              label: "Mahsulotlar ",
              icon: <ShoppingCartOutlined />,
            },
          ].map((tab) => (
            <Button
              key={tab.key}
              type={activeTab === tab.key ? "primary" : "text"}
              onClick={() => setActiveTab(tab.key)}
              icon={tab.icon}
              style={{
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "12px",
                height: "32px",
                width: "120px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                border: "1px solid gray",
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* ✅ TEZ TUGMALAR VA SANA SELECTOR */}
      <Card
        style={{
          marginBottom: "20px",
          borderRadius: "12px",
          border: "none",
          boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        }}
        bodyStyle={{ padding: "16px" }}
      >
        {/* Tez Tugmalar */}
        <div style={{ marginBottom: "12px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "#666",
              marginBottom: "8px",
              fontWeight: "600",
            }}
          >
            ⚡ Tez Filtrlar:
          </div>
          <Space wrap size="small">
            <Button
              size="small"
              type={activeQuickFilter === "Bugun" ? "primary" : "default"}
              icon={<ClockCircleOutlined />}
              onClick={() => handleQuickFilter(0, "Bugun")}
              style={{ borderRadius: "6px", fontSize: "12px" }}
            >
              Bugun
            </Button>
            <Button
              size="small"
              type={activeQuickFilter === "Kecha" ? "primary" : "default"}
              icon={<HistoryOutlined />}
              onClick={() => handleQuickFilter(1, "Kecha")}
              style={{ borderRadius: "6px", fontSize: "12px" }}
            >
              Kecha
            </Button>
            <Button
              size="small"
              type={activeQuickFilter === "7 kun" ? "primary" : "default"}
              onClick={() => handleQuickFilter(7, "7 kun")}
              style={{ borderRadius: "6px", fontSize: "12px" }}
            >
              7 kun
            </Button>
            <Button
              size="small"
              type={activeQuickFilter === "15 kun" ? "primary" : "default"}
              onClick={() => handleQuickFilter(15, "15 kun")}
              style={{ borderRadius: "6px", fontSize: "12px" }}
            >
              15 kun
            </Button>
            <Button
              size="small"
              type={activeQuickFilter === "30 kun" ? "primary" : "default"}
              onClick={() => handleQuickFilter(30, "30 kun")}
              style={{ borderRadius: "6px", fontSize: "12px" }}
            >
              30 kun
            </Button>
            <Button
              size="small"
              type={activeQuickFilter === "Yillik" ? "primary" : "default"}
              onClick={() => handleQuickFilter(365, "Yillik")}
              style={{ borderRadius: "6px", fontSize: "12px" }}
            >
              Yillik
            </Button>
          </Space>
        </div>

        <Divider style={{ margin: "12px 0" }} />

        {/* Davr va Custom Sana - ✅ Oddiy HTML input type="date" */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Product selection modal */}
          <Modal
            visible={productSelectModalVisible}
            title="Mahsulotlarni tanlash"
            onCancel={() => setProductSelectModalVisible(false)}
            onOk={() => setProductSelectModalVisible(false)}
            width={1000}
            destroyOnClose
          >
            <Row gutter={16}>
              <Col span={16}>
                <div style={{ marginBottom: 8 }}>
                  <strong>Mahsulotlar</strong>
                </div>
                {/* Hide product list - categories-only modal requested */}
                <div style={{ padding: 12 }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Kategoriyalar</strong>
                  </div>
                  <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 8 }}>
                    {
                      (() => {
                        const realCats = categories.filter((c) => c !== 'all');
                        return (
                          <Checkbox
                            indeterminate={selectedCategories.size > 0 && selectedCategories.size < realCats.length}
                            checked={selectedCategories.size === realCats.length}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedCategories(new Set(realCats));
                              else setSelectedCategories(new Set());
                            }}
                            style={{ marginBottom: 8 }}
                          >
                            Barchasi
                          </Checkbox>
                        );
                      })()
                    }
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {categories.filter(c => c !== 'all').map((cat) => (
                        <Checkbox
                          key={cat}
                          checked={selectedCategories.has(cat)}
                          onChange={(e) => {
                            const next = new Set(selectedCategories);
                            if (e.target.checked) next.add(cat);
                            else next.delete(cat);
                            setSelectedCategories(next);
                          }}
                        >
                          {cat}
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button onClick={() => { setProductSelectModalVisible(false); }}>Bekor qilish</Button>
                    <Button type="primary" onClick={() => { setAppliedCategories(new Set(selectedCategories)); setProductSelectModalVisible(false); }}>
                      Qo'llash
                    </Button>
                  </div>
                </div>
              </Col>
                {/* Right column removed - categories-only modal requested earlier */}
            </Row>
          </Modal>
          <Space size="small">
            <label style={{ fontSize: "12px", color: "#666" }}>
              Boshlang'ich sana:
            </label>
            <input
              type="date"
              value={startDate ? moment(startDate).format("YYYY-MM-DD") : ""}
              onChange={(e) => {
                const newStart = e.target.value
                  ? new Date(e.target.value)
                  : null;
                setStartDate(newStart);
                if (endDate && newStart > endDate) setEndDate(null); // Agar start > end bo'lsa, end ni tozalash
              }}
              style={{
                padding: "4px 8px",
                border: "1px solid #d9d9d9",
                borderRadius: "4px",
                fontSize: "12px",
                width: "120px",
              }}
            />
            <label style={{ fontSize: "12px", color: "#666" }}>
              Tugash sana:
            </label>
            <input
              type="date"
              value={endDate ? moment(endDate).format("YYYY-MM-DD") : ""}
              onChange={(e) => {
                const newEnd = e.target.value ? new Date(e.target.value) : null;
                setEndDate(newEnd);
                if (startDate && newEnd < startDate) setStartDate(null); // Agar end < start bo'lsa, start ni tozalash
              }}
              style={{
                padding: "4px 8px",
                border: "1px solid #d9d9d9",
                borderRadius: "4px",
                fontSize: "12px",
                width: "120px",
              }}
            />
            <Button
              icon={<EyeOutlined />}
              onClick={() => {
                setFilterCategory("all");
                setStartDate(null);
                setEndDate(null);
                setActiveQuickFilter(null);
                setPeriod("daily");
              }}
              size="small"
            >
              Tozalash
            </Button>
          </Space>
        </div>
      </Card>

      {activeTab === "overview" && (
        <>
          {/* Asosiy statistika kartalari */}
          <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
            <Col xs={12} sm={12} lg={6}>
              <ModernStatCard
                title="Buyurtmalar"
                value={processedStats.totalOrders}
                icon={<ShoppingCartOutlined />}
                color="#1890ff"
                growth={parseFloat(processedStats.growthRate)}
              />
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <ModernStatCard
                title="Tushum"
                value={processedStats.totalIncome}
                icon={<DollarOutlined />}
                color="#52c41a"
                suffix=" so'm"
                subtitle={`O'rtacha: ${Math.round(
                  processedStats.averageOrderValue
                ).toLocaleString()} so'm`}
              />
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <ModernStatCard
                title="Afitsiantlar Oyligi"
                value={processedStats.totalServiceAmount}
                icon={<WalletOutlined />}
                color="#722ed1"
                suffix=" so'm"
              />
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <ModernStatCard
                title="Naqd Pul"
                value={processedStats.totalCash}
                icon={<DollarOutlined />}
                color="#13c2c2"
                suffix=" so'm"
                subtitle={
                  processedStats.totalIncome > 0
                    ? `${(
                        (processedStats.totalCash /
                          processedStats.totalIncome) *
                        100
                      ).toFixed(1)}% tushumdan`
                    : ""
                }
              />
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <ModernStatCard
                title="Karta"
                value={processedStats.totalCard}
                icon={<CreditCardOutlined />}
                color="#f759ab"
                suffix=" so'm"
                subtitle={
                  processedStats.totalIncome > 0
                    ? `${(
                        (processedStats.totalCard /
                          processedStats.totalIncome) *
                        100
                      ).toFixed(1)}% tushumdan`
                    : ""
                }
              />
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <ModernStatCard
                title="Click"
                value={processedStats.totalClick}
                icon={<CreditCardOutlined />}
                color="#fa8c16"
                suffix=" so'm"
                subtitle={
                  processedStats.totalIncome > 0
                    ? `${(
                        (processedStats.totalClick /
                          processedStats.totalIncome) *
                        100
                      ).toFixed(1)}% tushumdan`
                    : ""
                }
              />
            </Col>
          </Row>

          {/* Eng sotilgan taomlar */}
          <Card
            title="Eng Ko'p Sotilgan Taomlar"
            style={{
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              marginBottom: "20px",
            }}
            loading={processing}
          >
            {popularDishes.length > 0 ? (
              popularDishes.slice(0, 5).map((dish, index) => (
                <div
                  key={index}
                  style={{
                    padding: "10px",
                    borderBottom: "1px solid #f0f0f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "4px",
                        background: "#1890ff",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "13px" }}>
                        {dish.name}
                      </div>
                      <Tag
                        color="blue"
                        size="small"
                        style={{ fontSize: "10px" }}
                      >
                        {dish.category}
                      </Tag>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontWeight: "bold",
                        color: "#1890ff",
                        fontSize: "13px",
                      }}
                    >
                      {dish.sold} ta
                    </div>
                    <div style={{ fontSize: "11px", color: "#666" }}>
                      {dish.revenue.toLocaleString()} so'm
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{ textAlign: "center", padding: "20px", color: "#999" }}
              >
                {startDate && endDate
                  ? `Tanlangan sana oralig'ida (${moment(startDate).format(
                      "DD.MM"
                    )} - ${moment(endDate).format(
                      "DD.MM"
                    )}) hech qanday taom sotilmagan. Boshqa sana sinab ko'ring yoki API dan ko'proq ma'lumot yuklang.`
                  : "Hech qanday ma'lumot topilmadi"}
              </div>
            )}
          </Card>
        </>
      )}
      {/* Waiter products modal */}
      <Modal
        visible={productModalVisible}
        title={modalWaiterName ? `${modalWaiterName} — Buyurtmalar (${modalOrders.length})` : `Buyurtmalar (${modalOrders.length})`}
        onCancel={() => setProductModalVisible(false)}
        footer={null}
        width={800}
      >
        {/* Filters removed per user request: modal now shows simple order list and products */}

        <Table
          columns={[
              { title: "№", dataIndex: "orderNumber", key: "index", width: 80, render: (_, record, idx) => {
                  const number = idx + 1 + ((modalPage && modalPageSize) ? (modalPage - 1) * modalPageSize : 0);
                  return <div style={{ fontSize: 12 }}>{number}</div>;
                }
              },
            {
              title: "Mahsulot",
              dataIndex: "items",
              key: "products",
              render: (items, record) => {
                const list = Array.isArray(items) && items.length
                  ? items.map(it => it.name || it.item_name || '-').filter(Boolean)
                  : (Array.isArray(record.items) && record.items.length ? record.items.map(it => it.name || it.item_name || '-').filter(Boolean) : []);
                const display = list.length > 3 ? `${list.slice(0,3).join(', ')}... (${list.length})` : list.join(', ');
                return (
                  <Tooltip title={list.join(', ')}>
                    <div style={{ fontSize: 13, maxWidth: 360, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {display || '-'}
                    </div>
                  </Tooltip>
                );
              }
            },
            { title: "Stol", dataIndex: "tableNumber", key: "tableNumber", width: 120 },
            { title: "Summa", dataIndex: "total", key: "total", width: 140, render: (t) => <div style={{fontWeight:700}}>{Math.round(t).toLocaleString()} so'm</div> },
          ]}
          dataSource={(() => {
            // start with modalOrders
            let arr = modalOrders || [];
            // Keep any existing modal date filters if present (user removed filters UI, but keep behavior if state set)
            if (modalStartDate && modalEndDate) {
              const s = moment(modalStartDate).startOf('day');
              const e = moment(modalEndDate).endOf('day');
              arr = arr.filter((o) => {
                const d = moment(o.date || o.createdAt || o.order_date);
                return d.isBetween(s, e, null, '[]');
              });
            }
            const startIdx = (modalPage - 1) * modalPageSize;
            return arr.slice(startIdx, startIdx + modalPageSize);
          })()}
          pagination={false}
          size="small"
          expandable={{
            expandedRowRender: (record) => (
              <div>
                {/* Simplified product list: only product name and price */}
                {Array.isArray(record.items) && record.items.length ? (
                  <div>
                    {record.items.map((it, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #f0f0f0' }}>
                        <div style={{ fontSize: 13 }}>{it.name || it.item_name || '-'}</div>
                        <div style={{ fontWeight: 700 }}>{Math.round(it.price || it.unit_price || 0).toLocaleString()} so'm</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#999' }}>Mahsulot topilmadi</div>
                )}
              </div>
            ),
          }}
        />

        {/* pagination centered under modal table */}
        {(modalOrders || []).length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Pagination
              current={modalPage}
              pageSize={modalPageSize}
              total={(modalStartDate && modalEndDate)
                ? modalOrders.filter(o => { const d = moment(o.date || o.createdAt || o.order_date); const s = moment(modalStartDate).startOf('day'); const e = moment(modalEndDate).endOf('day'); return d.isBetween(s, e, null, '[]'); }).length
                : modalOrders.length
              }
              onChange={(page, pageSize) => { setModalPage(page); setModalPageSize(pageSize); }}
              showSizeChanger
              pageSizeOptions={[8, 16, 24]}
            />
          </div>
        )}
      </Modal>

      {activeTab === "waiters" && (
        <Card
          title={
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <UserOutlined />
              <span>Ofitsiantlar</span>
              <Tag color="blue" style={{ fontSize: "11px" }}>
                {waiterStats?.length || 0} ta
              </Tag>
            </div>
          }
          style={{
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
            marginBottom: "20px",
          }}
          loading={processing}
        >
          {waiterStats.length > 0 ? (
            <Table
              columns={waiterColumns}
              dataSource={waiterStats}
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: 700 }}
            />
          ) : (
            <div
              style={{ textAlign: "center", padding: "20px", color: "#999" }}
            >
              {startDate && endDate
                ? `Tanlangan sana oralig'ida hech qanday ofitsiant faoliyat ko'rsatmagan.`
                : "Hech qanday ma'lumot topilmadi"}
            </div>
          )}
        </Card>
      )}

      {activeTab === "products" && (
        <Card
          title={
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <ShoppingCartOutlined />
                <span>Mahsulotlar (Jami)</span>
                {/* If user selected categories via popover, show per-category totals. Otherwise show overall total */}
                {appliedCategories && appliedCategories.size ? (
                  <>
                    {appliedCategories.size > 1 && (
                      <Tag color="purple" style={{ fontSize: "11px", fontWeight: 700 }}>
                        {[...appliedCategories].slice(0, 3).join("+")}{appliedCategories.size > 3 ? '+' : ''}: {combinedSelectedRevenue.toLocaleString()} so'm
                      </Tag>
                    )}
                    {[...appliedCategories].map((cat) => (
                      <Tag key={cat} color="cyan" style={{ fontSize: "11px", fontWeight: 700 }}>
                        {cat}: {((categoryTotals[cat] || 0)).toLocaleString()} so'm
                      </Tag>
                    ))}
                  </>
                ) : filterCategory && filterCategory !== "all" ? (
                  <Tag color="cyan" style={{ fontSize: "11px", fontWeight: 700 }}>
                    {filterCategory}: {(categoryTotals[filterCategory] || 0).toLocaleString()} so'm
                  </Tag>
                ) : (
                  <Tag color="cyan" style={{ fontSize: "11px", fontWeight: 700 }}>
                    Umumiy Daromad: {productsTotalRevenue.toLocaleString()} so'm
                  </Tag>
                )}
                <Tag color="green" style={{ fontSize: "11px" }}>
                  {aggregatedSoldItems.length} ta noyob mahsulot
                </Tag>
                {processing && (
                  <Tag color="orange" style={{ fontSize: "11px" }}>
                    Hisoblanyapti...
                  </Tag>
                )}
              </div>
              <Space size="small">
                <Popover
                  placement="bottomRight"
                  trigger="click"
                  content={
                    <div style={{ minWidth: 200 }}>
                      {(() => {
                        const realCats = categories.filter((c) => c !== "all");
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <Checkbox
                              indeterminate={appliedCategories.size > 0 && appliedCategories.size < realCats.length}
                              checked={appliedCategories.size === realCats.length}
                              onChange={(e) => {
                                if (e.target.checked) setAppliedCategories(new Set(realCats));
                                else setAppliedCategories(new Set());
                              }}
                            >
                              Barchasi
                            </Checkbox>
                            {realCats.map((cat) => (
                              <Checkbox
                                key={cat}
                                checked={appliedCategories.has(cat)}
                                onChange={(e) => {
                                  const next = new Set(appliedCategories);
                                  if (e.target.checked) next.add(cat);
                                  else next.delete(cat);
                                  setAppliedCategories(next);
                                }}
                              >
                                {cat}
                              </Checkbox>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  }
                >
                  <div
                    style={{
                      border: "1px solid #d9d9d9",
                      padding: "4px 10px",
                      borderRadius: 6,
                      minWidth: 120,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      background: "white",
                    }}
                  >
                    <div style={{ color: "#333" }}>
                      {appliedCategories && appliedCategories.size ? (
                        (() => {
                          const arr = [...appliedCategories];
                          if (arr.length > 3) return `${arr.slice(0,3).join(', ')}... (${arr.length})`;
                          return arr.join(', ');
                        })()
                      ) : filterCategory && filterCategory !== "all" ? (
                        filterCategory
                      ) : (
                        "Barchasi"
                      )}
                    </div>
                    <FilterOutlined />
                  </div>
                </Popover>
              </Space>
            </div>
          }
          style={{
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
          }}
          loading={loading || processing}
        >
          {aggregatedSoldItems.length > 0 ? (
            <Table
              columns={aggregatedSoldItemsColumns}
              dataSource={
                // Use applied categories filter if present, otherwise fallback to single filterCategory
                appliedCategories && appliedCategories.size
                  ? aggregatedSoldItems.filter((it) => appliedCategories.has(it.category))
                  : filterCategory && filterCategory !== 'all'
                  ? aggregatedSoldItems.filter((it) => it.category === filterCategory)
                  : aggregatedSoldItems
              }
              pagination={{
                pageSize: 50,
                showSizeChanger: true,
                pageSizeOptions: ["20", "50", "100", "200"],
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} / ${total} ta mahsulot`,
                showQuickJumper: true,
              }}
              size="small"
              scroll={{ y: 500, x: 800 }}
              loading={processing}
            />
          ) : (
            <div
              style={{ textAlign: "center", padding: "20px", color: "#999" }}
            >
              {startDate && endDate
                ? `Tanlangan sana oralig'ida (${moment(startDate).format(
                    "DD.MM"
                  )} - ${moment(endDate).format(
                    "DD.MM"
                  )}) hech qanday mahsulot sotilmagan. API dan ko'proq ma'lumot yuklang yoki boshqa sana sinab ko'ring.`
                : "Hech qanday mahsulot topilmadi"}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
