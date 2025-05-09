import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Metric, Device } from "@shared/schema";
import GaugeChart from "./GaugeChart";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { Info } from "lucide-react";

interface SystemMetricsProps {
  deviceId: number | null;
}

const SystemMetrics: React.FC<SystemMetricsProps> = ({ deviceId }) => {
  // Fetch device info
  const { data: device } = useQuery<Device>({ 
    queryKey: deviceId ? ['/api/devices', deviceId] : ['empty'],
    enabled: !!deviceId,
  });

  // Fetch metrics data with higher refresh rate - sửa đường dẫn API
  const metricsEndpoint = deviceId ? `/api/devices/${deviceId}/metrics` : null;
  
  const { data: metrics, isLoading } = useQuery<Metric[]>({ 
    queryKey: metricsEndpoint ? [metricsEndpoint] : ['empty'],
    enabled: !!deviceId,
    refetchInterval: 3000, // Refresh every 3 seconds to get latest data in near real-time
  });
  
  useEffect(() => {
    if (metrics && metrics.length > 0) {
      // Log metrics để debug
      console.log("Nhận được metrics:", metrics.length);
      console.log("Mẫu dữ liệu đầu tiên:", JSON.stringify(metrics[0]));
    }
  }, [metrics]);

  // Get latest metric
  const latestMetric = metrics && metrics.length > 0 
    ? [...metrics].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] 
    : null;
    
  useEffect(() => {
    if (latestMetric) {
      // Log metric mới nhất để debug
      console.log("Metric mới nhất:", JSON.stringify(latestMetric));
      console.log("CPU Usage:", latestMetric.cpuUsage);
      console.log("Memory Usage:", latestMetric.memoryUsage);
      console.log("Temperature:", latestMetric.temperature);
    }
  }, [latestMetric]);

  // Prepare chart data for the system usage graph
  const formatSystemUsageChart = () => {
    if (!metrics || metrics.length === 0) return [];
    
    const last30Metrics = [...metrics]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-30); // Last 30 data points
    
    return last30Metrics.map(metric => ({
      time: new Date(metric.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cpu: metric.cpuUsage || 0,
      memory: metric.memoryUsage || 0,
      disk: metric.downloadBandwidth ? Math.min(100, metric.downloadBandwidth / 1024 / 1024) : 0
    }));
  };

  const systemUsageData = formatSystemUsageChart();

  // Format date and time
  const formatDateTime = (date: Date) => {
    return {
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: date.toLocaleDateString('en-GB')
    };
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 shadow-md flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Render no data state
  if (!latestMetric) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 shadow-md flex items-center justify-center h-64">
        <p className="text-gray-400">No system metrics available</p>
      </div>
    );
  }

  // Lấy và xử lý dữ liệu từ metrics API
  const cpuUsage = latestMetric?.cpuUsage !== undefined ? Number(latestMetric.cpuUsage) : 0;
  const cpuTemp = latestMetric?.temperature !== undefined ? Number(latestMetric.temperature) : 0;
  const ramUsage = latestMetric?.memoryUsage !== undefined ? Number(latestMetric.memoryUsage) : 0;
  
  // Tính toán disk usage từ bandwidth - đảm bảo là số
  let diskUsage = 0;
  if (latestMetric?.uploadBandwidth !== undefined) {
    const uploadMb = Number(latestMetric.uploadBandwidth) / 1024 / 1024;
    diskUsage = Math.min(100, Math.round(uploadMb)); // Làm tròn và giới hạn tối đa 100%
  }
  
  // Log các giá trị đã xử lý
  console.log("Giá trị hiển thị:", { cpuUsage, cpuTemp, ramUsage, diskUsage });

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-4 gap-4">
        <GaugeChart 
          title="CPU Load" 
          value={cpuUsage} 
          unit="%" 
        />
        <GaugeChart 
          title="CPU Temp" 
          value={cpuTemp} 
          unit="°C" 
          max={100}
          colorConfig={{
            low: '#4CAF50',    // Green (good temp)
            medium: '#FFC107', // Yellow (moderate temp)
            high: '#F44336',   // Red (high temp)
          }}
        />
        <GaugeChart 
          title="Load RAM" 
          value={ramUsage} 
          unit="%" 
        />
        <GaugeChart 
          title="Load system disk" 
          value={diskUsage} 
          unit="%" 
        />
      </div>

      {/* System usage line chart */}
      <div className="bg-gray-900 rounded-lg p-4 shadow-md">
        <h3 className="text-sm font-medium text-gray-200 mb-3">System</h3>
        <div className="h-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={systemUsageData}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <XAxis dataKey="time" stroke="#aaa" tick={{ fontSize: 10 }} />
              <YAxis stroke="#aaa" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
              <Line 
                type="monotone" 
                dataKey="cpu" 
                name="Load CPU" 
                stroke="#4CAF50" 
                strokeWidth={2} 
                dot={false} 
              />
              <Line 
                type="monotone" 
                dataKey="memory" 
                name="RAM usage" 
                stroke="#FFC107" 
                strokeWidth={2} 
                dot={false} 
              />
              <Line 
                type="monotone" 
                dataKey="disk" 
                name="System disk" 
                stroke="#03A9F4" 
                strokeWidth={2} 
                dot={false} 
              />
              <Legend 
                iconSize={8} 
                iconType="circle" 
                wrapperStyle={{ fontSize: 10, color: '#ddd' }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed device information table - matching the image layout */}
      <div className="grid grid-cols-1 gap-y-2 text-xs bg-gray-900 rounded-lg shadow-md p-2">
        <div className="grid grid-cols-12 gap-2">
          <div className="flex flex-col justify-center p-2 bg-gray-800 rounded">
            <span className="text-gray-400 mb-1">Uptime</span>
            <span className="text-green-400 font-medium">5.0 days</span>
          </div>
          
          <div className="col-span-2 flex flex-col justify-center p-2 bg-gray-800 rounded">
            <span className="text-gray-400 mb-1">Model</span>
            <span className="text-green-400 font-medium">{device?.model || 'RouterOS CRS309-1G-8S+'}</span>
          </div>
          
          <div className="col-span-2 flex flex-col justify-center p-2 bg-gray-800 rounded">
            <span className="text-gray-400 mb-1">RouterOS date</span>
            <span className="text-green-400 font-medium">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}<br />
              {new Date().toLocaleDateString('en-GB')}
            </span>
          </div>
          
          <div className="flex flex-col justify-center p-2 bg-gray-800 rounded">
            <span className="text-gray-400 mb-1">Firmware</span>
            <span className="text-green-400 font-medium">{device?.firmware || '7.16.2'}</span>
          </div>
          
          <div className="flex flex-col justify-center p-2 bg-gray-800 rounded">
            <span className="text-gray-400 mb-1">Board</span>
            <span className="text-green-400 font-medium">{latestMetric?.boardTemp !== null && latestMetric?.boardTemp !== undefined ? latestMetric.boardTemp.toFixed(1) + '°C' : 'N/A'}</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
            <div>
              <span className="text-gray-400 mb-1">Status</span>
              <span className="text-green-400 font-medium block">Running</span>
            </div>
            <Info className="text-gray-500" size={16} />
          </div>

          <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
            <div>
              <span className="text-gray-400 mb-1">POE Status</span>
              <span className="text-blue-400 font-medium block">No data</span>
            </div>
            <Info className="text-gray-500" size={16} />
          </div>

          <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
            <div>
              <span className="text-gray-400 mb-1">Errors</span>
              <span className="text-green-400 font-medium block">0</span>
            </div>
            <Info className="text-gray-500" size={16} />
          </div>

          <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
            <div>
              <span className="text-gray-400 mb-1">DHCPs</span>
              <span className="text-green-400 font-medium block">0</span>
            </div>
            <Info className="text-gray-500" size={16} />
          </div>

          <div className="flex flex-col justify-center p-2 bg-gray-800 rounded">
            <span className="text-gray-400 mb-1">CPU Mhz</span>
            <span className="text-green-400 font-medium">{device?.cpu?.includes('MHz') ? device.cpu : '800 MHz'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMetrics;