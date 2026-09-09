window.BATCHWATT_DEMO = {
  "factory": "Demo food factory",
  "shift": {"date": "2026-09-09", "start": "08:00", "end": "18:00"},
  "energy": {"currency": "INR", "baseKw": 8, "peakLimitKw": 65, "monthlyPeakKw": 45, "rate": 8, "peakRate": 14, "peakStart": "16:00", "peakEnd": "19:00", "demandRate": 350},
  "lines": [
    {"id":"heating","name":"Heating & filling","kw":32,"changeoverMinutes":15},
    {"id":"blending","name":"Blending","kw":24,"changeoverMinutes":15},
    {"id":"packing","name":"Packing","kw":18,"changeoverMinutes":15}
  ],
  "products": [
    {"id":"ghee","name":"Cow ghee 1 L","unit":"jars","lineId":"heating","rate":100,"stock":50,"packaging":500},
    {"id":"spice","name":"Sambar powder 200 g","unit":"packs","lineId":"blending","rate":100,"stock":20,"packaging":400},
    {"id":"snack","name":"Snack mix 250 g","unit":"packs","lineId":"packing","rate":150,"stock":60,"packaging":500},
    {"id":"bulk","name":"Bulk ghee 5 L","unit":"tins","lineId":"heating","rate":80,"stock":20,"packaging":200}
  ],
  "orders": [
    {"id":"ORD-001","customer":"Ravi Stores","productId":"ghee","qty":300,"due":"2026-09-09T12:30","priority":"Urgent"},
    {"id":"ORD-002","customer":"Anand Mart","productId":"spice","qty":220,"due":"2026-09-09T13:00","priority":"High"},
    {"id":"ORD-003","customer":"City Retail","productId":"snack","qty":300,"due":"2026-09-09T15:00","priority":"Standard"},
    {"id":"ORD-004","customer":"Wholesale account","productId":"bulk","qty":180,"due":"2026-09-09T17:00","priority":"Standard"}
  ]
};
