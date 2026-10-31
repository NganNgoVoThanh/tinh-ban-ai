import { describe, expect, it } from 'vitest';
import { matchIntent } from '../src/index.ts';

describe('khớp ý định câu hỏi tự do', () => {
  it('từ khóa theo chủ đề, chọn cung liên quan', () => {
    expect(matchIntent('Công việc của tôi có hợp làm kinh doanh không?')).toEqual({ questionType: 'career', palaces: ['quan_loc', 'menh'] });
    expect(matchIntent('Chuyện hôn nhân của tôi thế nào?')).toEqual({ questionType: 'love', palaces: ['phu_the', 'menh'] });
    expect(matchIntent('Năm nay tôi nên chú ý gì?').questionType).toBe('year');
  });

  it('nhắc tên cung thì lấy chủ đề của cung đó', () => {
    expect(matchIntent('Cung Tài Bạch của tôi nói gì?')).toEqual({ questionType: 'wealth', palaces: ['tai_bach', 'menh'] });
  });

  it('câu hỏi chung dùng Mệnh và 5 cung hay hỏi', () => {
    expect(matchIntent('Kể tôi nghe về lá số này')).toEqual({ questionType: null, palaces: ['menh', 'quan_loc', 'tai_bach', 'phu_the', 'phuc_duc', 'thien_di'] });
  });
});
