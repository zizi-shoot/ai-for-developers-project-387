package owner

type Owner struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Service struct {
	owner Owner
}

func NewService(value Owner) *Service {
	return &Service{owner: value}
}

func (service *Service) Get() Owner {
	return service.owner
}
