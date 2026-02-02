import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Award, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Certificates = () => {
  const { getAuthHeaders } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const response = await axios.get(`${API_URL}/certificates`, getAuthHeaders());
      setCertificates(response.data);
    } catch (error) {
      toast.error('Failed to fetch certificates');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (certId, batchNumber) => {
    try {
      const response = await axios.get(`${API_URL}/certificates/${certId}/pdf`, {
        ...getAuthHeaders(),
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate_${batchNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Certificate downloaded');
    } catch (error) {
      toast.error('Failed to download certificate');
    }
  };

  return (
    <div className="space-y-6" data-testid="certificates-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary">Certificates</h1>
          <p className="text-muted-foreground mt-1">PCF certificates for approved batches</p>
        </div>
      </div>

      <div className="grid-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : certificates.length === 0 ? (
          <div className="p-12 text-center">
            <Award className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No certificates generated yet</p>
            <p className="text-sm text-muted-foreground mt-1">Approve a batch and generate its certificate</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Certificate ID</th>
                  <th>Batch</th>
                  <th>Plant</th>
                  <th>PCF Value</th>
                  <th>GWP Set</th>
                  <th>Generated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.id} data-testid={`cert-row-${cert.batch_number}`}>
                    <td className="font-mono text-xs">{cert.id.slice(0, 8)}...</td>
                    <td className="font-medium">{cert.batch_number}</td>
                    <td>{cert.plant_name}</td>
                    <td>
                      <span className="font-mono font-medium text-emerald-600">
                        {cert.pcf_value?.toFixed(4)} {cert.pcf_unit}
                      </span>
                    </td>
                    <td>{cert.gwp_set}</td>
                    <td className="text-muted-foreground text-sm">
                      {new Date(cert.generated_at).toLocaleDateString()}
                    </td>
                    <td>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => downloadPDF(cert.id, cert.batch_number)}
                        className="h-8"
                        data-testid={`download-cert-${cert.batch_number}`}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Certificates;
