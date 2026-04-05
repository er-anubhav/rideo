const StatCard = ({ title, value, icon: Icon, color = 'default', subtitle }) => {
  const toneClasses = {
    default: 'metric-card',
    inverse: 'metric-card metric-card-dark',
    soft: 'metric-card',
  };

  return (
    <div className={toneClasses[color] || toneClasses.default}>
      <div className="flex items-center justify-between">
        <div>
          <p className="metric-label">{title}</p>
          <h3 className="metric-value">{value}</h3>
          {subtitle && <p className="metric-subtitle">{subtitle}</p>}
        </div>
        <div className="metric-icon">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
